import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { addDays, daysBetween, todayInTimeZone } from "./lib/dates";
import { ensureDepositLedgerEntry } from "./lib/ledger";
import {
  notifyPaymentConfirmed,
  notifySlotConfirmed,
} from "./lib/notifications";
import { consumeSlotForCommitment, slotBalance } from "./lib/pactPasses";
import { PACT_SLOT_AMOUNT } from "./lib/payments";

type PaymentPurpose = "slot_fee" | "pact_deposit";
const LEGAL_ACCEPTANCE_NOTE =
  "User accepted Terms, Payment Policy, and Proof Rules version 2026-05-22 before checkout.";

async function existingPaidOrderForPurpose(
  ctx: MutationCtx,
  args: { commitmentId: Id<"commitments">; purpose: PaymentPurpose },
) {
  return await ctx.db
    .query("paymentOrders")
    .withIndex("by_commitment", (q) => q.eq("commitmentId", args.commitmentId))
    .filter((q) =>
      q.and(
        q.eq(q.field("status"), "paid"),
        q.eq(q.field("purpose"), args.purpose),
      ),
    )
    .first();
}

function shiftCommitmentDates(commitment: Doc<"commitments">) {
  const today = todayInTimeZone(commitment.timezone);
  const startsBeforeConfirmation = commitment.startDate < today;
  const shiftedStartDate = startsBeforeConfirmation
    ? today
    : commitment.startDate;
  const shiftedEndDate = startsBeforeConfirmation
    ? addDays(commitment.endDate, daysBetween(commitment.startDate, today) - 1)
    : commitment.endDate;

  return {
    startDate: shiftedStartDate,
    endDate: shiftedEndDate,
    durationDays: daysBetween(shiftedStartDate, shiftedEndDate),
  };
}

export const prepareSlotCheckoutOrder = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = new Date().toISOString();
    const receipt = `slot_${user._id.slice(-12)}_${Date.now()}`;
    const slotPurchaseId = await ctx.db.insert("pactSlotPurchases", {
      userId: user._id,
      amount: PACT_SLOT_AMOUNT,
      currency: "INR",
      status: "pending_payment",
      createdAt: now,
      updatedAt: now,
    });

    const paymentOrderId = await ctx.db.insert("paymentOrders", {
      userId: user._id,
      slotPurchaseId,
      purpose: "slot_fee",
      razorpayOrderId: `pending:${receipt}`,
      amount: PACT_SLOT_AMOUNT,
      depositAmount: 0,
      platformFeeAmount: PACT_SLOT_AMOUNT,
      currency: "INR",
      status: "created",
      receipt,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(slotPurchaseId, {
      paymentOrderId,
      updatedAt: now,
    });

    return {
      paymentOrderId,
      slotPurchaseId,
      userId: user._id,
      userName: user.displayName,
      userEmail: user.email,
      userPhone: user.phone,
      userWhatsAppNumber: user.whatsappNumber,
      amount: PACT_SLOT_AMOUNT,
      currency: "INR",
      receipt,
    };
  },
});

export const prepareDepositCheckoutOrder = internalMutation({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const commitment = await ctx.db.get(args.commitmentId);
    if (
      !commitment ||
      commitment.userId !== user._id ||
      !["draft", "pending_deposit", "pending_payment"].includes(
        commitment.status,
      )
    ) {
      throw new Error("Draft pact not found");
    }
    if ((await slotBalance(ctx, user._id)) < 1) {
      throw new Error("Buy a Pact Pass before starting");
    }
    if (
      await existingPaidOrderForPurpose(ctx, {
        commitmentId: commitment._id,
        purpose: "pact_deposit",
      })
    ) {
      throw new Error("This pact deposit is already paid");
    }

    const now = new Date().toISOString();
    const receipt = `deposit_${commitment._id.slice(-12)}_${Date.now()}`;
    const paymentOrderId = await ctx.db.insert("paymentOrders", {
      userId: user._id,
      commitmentId: commitment._id,
      purpose: "pact_deposit",
      razorpayOrderId: `pending:${receipt}`,
      amount: commitment.pactAmount,
      depositAmount: commitment.pactAmount,
      platformFeeAmount: 0,
      currency: commitment.currency,
      status: "created",
      receipt,
      createdAt: now,
      updatedAt: now,
    });

    if (
      commitment.status === "draft" ||
      commitment.status === "pending_payment"
    ) {
      await ctx.db.patch(commitment._id, {
        status: "pending_deposit",
        updatedAt: now,
      });
    }

    return {
      paymentOrderId,
      commitmentId: commitment._id,
      commitmentName: commitment.name,
      userId: user._id,
      userName: user.displayName,
      userEmail: user.email,
      userPhone: user.phone,
      userWhatsAppNumber: user.whatsappNumber,
      amount: commitment.pactAmount,
      currency: commitment.currency,
      receipt,
    };
  },
});

export const attachRazorpayOrder = internalMutation({
  args: {
    paymentOrderId: v.id("paymentOrders"),
    razorpayOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.paymentOrderId);
    if (!order) throw new Error("Payment order not found");
    await ctx.db.patch(order._id, {
      razorpayOrderId: args.razorpayOrderId,
      updatedAt: new Date().toISOString(),
    });
    if (order.slotPurchaseId) {
      await ctx.db.patch(order.slotPurchaseId, {
        razorpayOrderId: args.razorpayOrderId,
        updatedAt: new Date().toISOString(),
      });
    }
  },
});

export const markSlotCheckoutPaid = internalMutation({
  args: {
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const paymentOrder = await ctx.db
      .query("paymentOrders")
      .withIndex("by_razorpay_order", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId),
      )
      .unique();
    if (
      !paymentOrder ||
      paymentOrder.userId !== user._id ||
      paymentOrder.purpose !== "slot_fee" ||
      !paymentOrder.slotPurchaseId
    ) {
      throw new Error("Slot payment order not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(paymentOrder._id, {
      razorpayPaymentId: args.razorpayPaymentId,
      signature: args.signature,
      status: "paid",
      paidAt: now,
      updatedAt: now,
    });

    const slotPurchase = await ctx.db.get(paymentOrder.slotPurchaseId);
    if (!slotPurchase) throw new Error("Slot purchase not found");
    await ctx.db.patch(slotPurchase._id, {
      status: "paid",
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      paidAt: now,
      updatedAt: now,
    });

    const existingCredit = await ctx.db
      .query("pactSlotLedgerEntries")
      .withIndex("by_purchase", (q) => q.eq("slotPurchaseId", slotPurchase._id))
      .filter((q) => q.eq(q.field("type"), "slot_purchased"))
      .first();
    if (!existingCredit) {
      await ctx.db.insert("pactSlotLedgerEntries", {
        userId: user._id,
        slotPurchaseId: slotPurchase._id,
        type: "slot_purchased",
        quantity: 1,
        amount: PACT_SLOT_AMOUNT,
        currency: slotPurchase.currency,
        externalReference: args.razorpayPaymentId,
        note: `Non-refundable Pact Pass fee collected as revenue. ${LEGAL_ACCEPTANCE_NOTE}`,
        createdAt: now,
      });
    }

    await notifySlotConfirmed(ctx, {
      user,
      amount: PACT_SLOT_AMOUNT,
      currency: slotPurchase.currency,
    });

    return { ok: true };
  },
});

export const markDepositCheckoutPaid = internalMutation({
  args: {
    commitmentId: v.id("commitments"),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment || commitment.userId !== user._id) {
      throw new Error("Commitment not found");
    }
    const paymentOrder = await ctx.db
      .query("paymentOrders")
      .withIndex("by_razorpay_order", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId),
      )
      .unique();
    if (
      !paymentOrder ||
      paymentOrder.userId !== user._id ||
      paymentOrder.commitmentId !== commitment._id ||
      paymentOrder.purpose !== "pact_deposit"
    ) {
      throw new Error("Deposit payment order not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(paymentOrder._id, {
      razorpayPaymentId: args.razorpayPaymentId,
      signature: args.signature,
      status: "paid",
      paidAt: now,
      updatedAt: now,
    });

    if (commitment.status !== "active") {
      const shifted = shiftCommitmentDates(commitment);
      await consumeSlotForCommitment(ctx, {
        userId: commitment.userId,
        commitmentId: commitment._id,
        externalReference: args.razorpayPaymentId,
      });

      const paymentNote =
        `Razorpay pact deposit collected. Deposit recorded as refundable pact liability. ${LEGAL_ACCEPTANCE_NOTE}`;
      await ctx.db.patch(commitment._id, {
        status: "active",
        ...shifted,
        slotConsumedAt: now,
        paymentConfirmedAt: now,
        paymentReference: args.razorpayPaymentId,
        paymentNote,
        updatedAt: now,
      });

      await ensureDepositLedgerEntry(ctx, {
        userId: commitment.userId,
        commitmentId: commitment._id,
        amount: commitment.pactAmount,
        currency: commitment.currency,
        externalReference: args.razorpayPaymentId,
        note: `Refundable pact deposit liability collected through Razorpay. ${LEGAL_ACCEPTANCE_NOTE}`,
      });

      await notifyPaymentConfirmed(ctx, {
        user,
        commitment: {
          ...commitment,
          status: "active",
          ...shifted,
          slotConsumedAt: now,
          paymentConfirmedAt: now,
          paymentReference: args.razorpayPaymentId,
          paymentNote,
          updatedAt: now,
        },
      });
    }

    return { ok: true };
  },
});
