import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { notifyManualPayoutRequested } from "./lib/notifications";
import { toRazorpayMinorUnits } from "./lib/payments";

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

type CheckoutOrderData = {
  paymentOrderId: Id<"paymentOrders">;
  slotPurchaseId?: Id<"pactSlotPurchases">;
  commitmentId?: Id<"commitments">;
  commitmentName?: string;
  userId: Id<"users">;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  amount: number;
  currency: string;
  receipt: string;
};

type CheckoutOrderResult = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

type MutationOk = { ok: true };

function normalizeUpiId(value: string) {
  return value.trim().toLowerCase();
}

function assertValidUpiId(upiId: string) {
  if (!/^[a-z0-9.\-_]{2,256}@[a-z0-9.\-_]{2,64}$/i.test(upiId)) {
    throw new Error("Enter a valid UPI ID before requesting payout");
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function basicAuthHeader() {
  return `Basic ${btoa(`${requiredEnv("RAZORPAY_KEY_ID")}:${requiredEnv("RAZORPAY_KEY_SECRET")}`)}`;
}

function jsonResponseError(prefix: string, status: number, payload: unknown) {
  const body =
    payload && typeof payload === "object" && "error" in payload
      ? JSON.stringify(payload)
      : String(payload);
  return new Error(`${prefix} failed (${status}): ${body}`);
}

async function hmacSha256Hex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function razorpayPost<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      authorization: basicAuthHeader(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T;
  if (!response.ok) {
    throw jsonResponseError("Razorpay request", response.status, payload);
  }
  return payload;
}

async function createRazorpayOrder(
  data: CheckoutOrderData,
  purpose: "slot_fee" | "pact_deposit",
) {
  const razorpayOrder = await razorpayPost<RazorpayOrderResponse>("/orders", {
    amount: toRazorpayMinorUnits(data.amount),
    currency: data.currency,
    receipt: data.receipt,
    notes: {
      paymentPurpose: purpose,
      userId: data.userId,
      commitmentId: data.commitmentId,
      slotPurchaseId: data.slotPurchaseId,
    },
  });

  return razorpayOrder;
}

async function attachOrder(
  ctx: any,
  data: CheckoutOrderData,
  razorpayOrder: RazorpayOrderResponse,
) {
  await ctx.runMutation(internal.paymentsInternal.attachRazorpayOrder, {
    paymentOrderId: data.paymentOrderId,
    razorpayOrderId: razorpayOrder.id,
  });
}

function orderResult(
  data: CheckoutOrderData,
  razorpayOrder: RazorpayOrderResponse,
  description: string,
): CheckoutOrderResult {
  return {
    keyId: requiredEnv("RAZORPAY_KEY_ID"),
    orderId: razorpayOrder.id,
    amount: data.amount,
    currency: data.currency,
    name: "Pact Raven",
    description,
    prefill: {
      name: data.userName,
      email: data.userEmail,
      contact: data.userPhone,
    },
  };
}

export const slotSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const ledger = await ctx.db
      .query("pactSlotLedgerEntries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const purchases = await ctx.db
      .query("pactSlotPurchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const purchased = ledger
      .filter((entry) => entry.type === "slot_purchased")
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const consumed = Math.abs(
      ledger
        .filter((entry) => entry.type === "slot_consumed")
        .reduce((sum, entry) => sum + entry.quantity, 0),
    );
    const adjusted = ledger
      .filter((entry) => entry.type === "slot_adjustment")
      .reduce((sum, entry) => sum + entry.quantity, 0);

    return {
      purchased,
      consumed,
      adjusted,
      available: Math.max(0, purchased - consumed + adjusted),
      pendingPurchases: purchases.filter(
        (purchase) => purchase.status === "pending_payment",
      ).length,
    };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const orders = await ctx.db
      .query("paymentOrders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const getForCommitment = query({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment || commitment.userId !== user._id) return null;
    return await ctx.db
      .query("paymentOrders")
      .withIndex("by_commitment", (q) => q.eq("commitmentId", commitment._id))
      .order("desc")
      .first();
  },
});

export const createSlotCheckoutOrder = action({
  args: {},
  handler: async (ctx): Promise<CheckoutOrderResult> => {
    const data = (await ctx.runMutation(
      internal.paymentsInternal.prepareSlotCheckoutOrder,
      {},
    )) as CheckoutOrderData;

    const razorpayOrder = await createRazorpayOrder(data, "slot_fee");
    await attachOrder(ctx, data, razorpayOrder);
    return orderResult(data, razorpayOrder, "One non-refundable pact slot");
  },
});

export const createDepositCheckoutOrder = action({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, args): Promise<CheckoutOrderResult> => {
    const data = (await ctx.runMutation(
      internal.paymentsInternal.prepareDepositCheckoutOrder,
      { commitmentId: args.commitmentId },
    )) as CheckoutOrderData;

    const razorpayOrder = await createRazorpayOrder(data, "pact_deposit");
    await attachOrder(ctx, data, razorpayOrder);
    return orderResult(
      data,
      razorpayOrder,
      data.commitmentName ?? "Refundable pact deposit",
    );
  },
});

export const verifySlotCheckoutPayment = action({
  args: {
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args): Promise<MutationOk> => {
    const expected = await hmacSha256Hex(
      requiredEnv("RAZORPAY_KEY_SECRET"),
      `${args.razorpayOrderId}|${args.razorpayPaymentId}`,
    );
    if (!timingSafeEqual(expected, args.razorpaySignature)) {
      throw new Error("Razorpay payment signature verification failed");
    }

    return (await ctx.runMutation(
      internal.paymentsInternal.markSlotCheckoutPaid,
      {
        razorpayOrderId: args.razorpayOrderId,
        razorpayPaymentId: args.razorpayPaymentId,
        signature: args.razorpaySignature,
      },
    )) as MutationOk;
  },
});

export const verifyDepositCheckoutPayment = action({
  args: {
    commitmentId: v.id("commitments"),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args): Promise<MutationOk> => {
    const expected = await hmacSha256Hex(
      requiredEnv("RAZORPAY_KEY_SECRET"),
      `${args.razorpayOrderId}|${args.razorpayPaymentId}`,
    );
    if (!timingSafeEqual(expected, args.razorpaySignature)) {
      throw new Error("Razorpay payment signature verification failed");
    }

    return (await ctx.runMutation(
      internal.paymentsInternal.markDepositCheckoutPaid,
      {
        commitmentId: args.commitmentId,
        razorpayOrderId: args.razorpayOrderId,
        razorpayPaymentId: args.razorpayPaymentId,
        signature: args.razorpaySignature,
      },
    )) as MutationOk;
  },
});

export const requestManualPayout = mutation({
  args: {
    amount: v.number(),
    currency: v.optional(v.string()),
    upiId: v.string(),
    payeeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const currency = (args.currency ?? "INR").trim().toUpperCase();
    const upiId = normalizeUpiId(args.upiId);
    const payeeName = args.payeeName?.trim() || undefined;
    assertValidUpiId(upiId);
    if (args.amount <= 0) throw new Error("Refund amount must be positive");

    const existing = await ctx.db
      .query("manualPayoutRequests")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("currency"), currency))
      .first();
    if (existing) {
      throw new Error("A manual payout request is already pending");
    }

    const entries = await ctx.db
      .query("walletLedgerEntries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const available = entries.reduce((total, entry) => {
      if (entry.currency !== currency) return total;
      if (entry.type === "approved_refund" && entry.destination === "user") {
        return total + entry.amount;
      }
      if (entry.type === "manual_payout") {
        return total - entry.amount;
      }
      return total;
    }, 0);

    const amount = Math.round(Math.min(args.amount, available) * 100) / 100;
    if (amount <= 0) throw new Error("No refund credit is available");

    const now = new Date().toISOString();
    const requestId = await ctx.db.insert("manualPayoutRequests", {
      userId: user._id,
      amount,
      currency,
      upiId,
      payeeName,
      status: "pending",
      note: payeeName ? `Payee: ${payeeName}` : undefined,
      createdAt: now,
      updatedAt: now,
    });

    await notifyManualPayoutRequested(ctx, { user, amount, currency });

    return { ok: true, requestId, amount, currency };
  },
});
