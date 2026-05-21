import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { addDays, daysBetween, todayInTimeZone } from "./lib/dates";
import {
  ensureDepositLedgerEntry,
  insertManualPayoutLedgerEntry,
} from "./lib/ledger";
import { notifyPaymentConfirmed } from "./lib/notifications";
import {
  commitmentCheckoutAmount,
  commitmentPlatformFee,
} from "./lib/payments";

async function walletBalanceByCurrency(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const entries = await ctx.db
    .query("walletLedgerEntries")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const balances = new Map<string, number>();
  for (const entry of entries) {
    const current = balances.get(entry.currency) ?? 0;
    if (entry.type === "approved_refund" && entry.destination === "user") {
      balances.set(entry.currency, current + entry.amount);
    } else if (entry.type === "manual_payout") {
      balances.set(entry.currency, current - entry.amount);
    }
  }

  return balances;
}

export const prepareCheckoutOrder = internalMutation({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const commitment = await ctx.db.get(args.commitmentId);
    if (
      !commitment ||
      commitment.userId !== user._id ||
      commitment.status !== "pending_payment"
    ) {
      throw new Error("Pending commitment not found");
    }

    const existingPaidOrder = await ctx.db
      .query("paymentOrders")
      .withIndex("by_commitment", (q) => q.eq("commitmentId", commitment._id))
      .filter((q) => q.eq(q.field("status"), "paid"))
      .first();
    if (existingPaidOrder) throw new Error("This commitment is already paid");

    const now = new Date().toISOString();
    const amount = commitmentCheckoutAmount(commitment);
    const receipt = `pact_${commitment._id.slice(-16)}_${Date.now()}`;
    const paymentOrderId = await ctx.db.insert("paymentOrders", {
      userId: user._id,
      commitmentId: commitment._id,
      razorpayOrderId: `pending:${receipt}`,
      amount,
      depositAmount: commitment.pactAmount,
      platformFeeAmount: commitmentPlatformFee(commitment),
      currency: commitment.currency,
      status: "created",
      receipt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      paymentOrderId,
      commitmentId: commitment._id,
      commitmentName: commitment.name,
      userId: user._id,
      userName: user.displayName,
      userEmail: user.email,
      userPhone: user.phone,
      amount,
      depositAmount: commitment.pactAmount,
      platformFeeAmount: commitmentPlatformFee(commitment),
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
    await ctx.db.patch(args.paymentOrderId, {
      razorpayOrderId: args.razorpayOrderId,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const markCheckoutPaid = internalMutation({
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
      paymentOrder.commitmentId !== commitment._id
    ) {
      throw new Error("Payment order not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(paymentOrder._id, {
      razorpayPaymentId: args.razorpayPaymentId,
      signature: args.signature,
      status: "paid",
      paidAt: now,
      updatedAt: now,
    });

    if (commitment.status === "pending_payment") {
      const today = todayInTimeZone(commitment.timezone);
      const startsBeforeConfirmation = commitment.startDate < today;
      const shiftedStartDate = startsBeforeConfirmation
        ? today
        : commitment.startDate;
      const shiftedEndDate = startsBeforeConfirmation
        ? addDays(
            commitment.endDate,
            daysBetween(commitment.startDate, today) - 1,
          )
        : commitment.endDate;

      await ctx.db.patch(commitment._id, {
        status: "active",
        startDate: shiftedStartDate,
        endDate: shiftedEndDate,
        durationDays: daysBetween(shiftedStartDate, shiftedEndDate),
        paymentConfirmedAt: now,
        paymentReference: args.razorpayPaymentId,
        paymentNote: `Verified Razorpay Checkout payment. Order: ${args.razorpayOrderId}`,
        updatedAt: now,
      });

      await ensureDepositLedgerEntry(ctx, {
        userId: commitment.userId,
        commitmentId: commitment._id,
        amount: commitment.pactAmount,
        currency: commitment.currency,
        externalReference: args.razorpayPaymentId,
        note: `Refundable deposit received. Platform fee: ${commitmentPlatformFee(commitment)} ${commitment.currency}.`,
      });

      await notifyPaymentConfirmed(ctx, {
        user,
        commitment: {
          ...commitment,
          status: "active",
          startDate: shiftedStartDate,
          endDate: shiftedEndDate,
          durationDays: daysBetween(shiftedStartDate, shiftedEndDate),
          paymentConfirmedAt: now,
          paymentReference: args.razorpayPaymentId,
          paymentNote: `Verified Razorpay Checkout payment. Order: ${args.razorpayOrderId}`,
          updatedAt: now,
        },
      });
    }

    return { ok: true };
  },
});

export const prepareRefundWithdrawal = internalMutation({
  args: {
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const balances = await walletBalanceByCurrency(ctx, user._id);
    const available = balances.get(args.currency) ?? 0;
    if (args.amount > available + 0.01) {
      throw new Error("Refund amount exceeds available balance");
    }

    const orders = await ctx.db
      .query("paymentOrders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const withdrawals = await ctx.db
      .query("refundWithdrawals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const paymentOrder = orders
      .filter(
        (order) =>
          order.status === "paid" &&
          order.currency === args.currency &&
          order.razorpayPaymentId,
      )
      .sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""))
      .find((order) => {
        const alreadyRefunded = withdrawals
          .filter(
            (withdrawal) =>
              withdrawal.paymentOrderId === order._id &&
              withdrawal.status !== "failed",
          )
          .reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
        return (
          Math.max(0, order.depositAmount - alreadyRefunded) + 0.01 >=
          args.amount
        );
      });
    if (!paymentOrder?.razorpayPaymentId) {
      throw new Error("No refundable Razorpay payment found for this balance");
    }

    const now = new Date().toISOString();
    const withdrawalId = await ctx.db.insert("refundWithdrawals", {
      userId: user._id,
      paymentOrderId: paymentOrder._id,
      razorpayPaymentId: paymentOrder.razorpayPaymentId,
      amount: Math.round(args.amount * 100) / 100,
      currency: args.currency,
      status: "processing",
      createdAt: now,
      updatedAt: now,
    });

    return {
      withdrawalId,
      userId: user._id,
      razorpayPaymentId: paymentOrder.razorpayPaymentId,
      amount: Math.round(args.amount * 100) / 100,
      currency: args.currency,
    };
  },
});

export const markRefundWithdrawalProcessed = internalMutation({
  args: {
    withdrawalId: v.id("refundWithdrawals"),
    razorpayRefundId: v.string(),
  },
  handler: async (ctx, args) => {
    const withdrawal = await ctx.db.get(args.withdrawalId);
    if (!withdrawal) throw new Error("Refund withdrawal not found");
    const now = new Date().toISOString();

    await ctx.db.patch(withdrawal._id, {
      razorpayRefundId: args.razorpayRefundId,
      status: "processed",
      processedAt: now,
      updatedAt: now,
    });

    await insertManualPayoutLedgerEntry(ctx, {
      userId: withdrawal.userId,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      externalReference: args.razorpayRefundId,
      note: "Razorpay refund API withdrawal",
    });
  },
});

export const markRefundWithdrawalFailed = internalMutation({
  args: {
    withdrawalId: v.id("refundWithdrawals"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.withdrawalId, {
      status: "failed",
      failureReason: args.reason,
      updatedAt: new Date().toISOString(),
    });
  },
});
