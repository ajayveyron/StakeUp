import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { fromRazorpayMinorUnits, toRazorpayMinorUnits } from "./lib/payments";

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

type RazorpayRefundResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

type CheckoutOrderData = {
  paymentOrderId: Id<"paymentOrders">;
  commitmentId: Id<"commitments">;
  commitmentName: string;
  userId: Id<"users">;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  amount: number;
  depositAmount: number;
  platformFeeAmount: number;
  currency: string;
  receipt: string;
};

type CheckoutOrderResult = {
  keyId: string;
  orderId: string;
  amount: number;
  depositAmount: number;
  platformFeeAmount: number;
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

type RefundWithdrawalData = {
  withdrawalId: Id<"refundWithdrawals">;
  userId: Id<"users">;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
};

type RefundWithdrawalResult = {
  ok: true;
  refundId: string;
  amount: number;
  currency: string;
  status: string;
};

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

export const createCheckoutOrder = action({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, args): Promise<CheckoutOrderResult> => {
    const data = (await ctx.runMutation(
      internal.paymentsInternal.prepareCheckoutOrder,
      {
        commitmentId: args.commitmentId,
      },
    )) as CheckoutOrderData;

    const razorpayOrder = await razorpayPost<RazorpayOrderResponse>("/orders", {
      amount: toRazorpayMinorUnits(data.amount),
      currency: data.currency,
      receipt: data.receipt,
      notes: {
        commitmentId: data.commitmentId,
        userId: data.userId,
        depositAmount: String(data.depositAmount),
        platformFeeAmount: String(data.platformFeeAmount),
      },
    });

    await ctx.runMutation(internal.paymentsInternal.attachRazorpayOrder, {
      paymentOrderId: data.paymentOrderId,
      razorpayOrderId: razorpayOrder.id,
    });

    return {
      keyId: requiredEnv("RAZORPAY_KEY_ID"),
      orderId: razorpayOrder.id,
      amount: data.amount,
      depositAmount: data.depositAmount,
      platformFeeAmount: data.platformFeeAmount,
      currency: data.currency,
      name: "Pact Raven",
      description: data.commitmentName,
      prefill: {
        name: data.userName,
        email: data.userEmail,
        contact: data.userPhone,
      },
    };
  },
});

export const verifyCheckoutPayment = action({
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

    return (await ctx.runMutation(internal.paymentsInternal.markCheckoutPaid, {
      commitmentId: args.commitmentId,
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      signature: args.razorpaySignature,
    })) as MutationOk;
  },
});

export const withdrawRefundBalance = action({
  args: {
    amount: v.number(),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<RefundWithdrawalResult> => {
    if (args.amount <= 0) throw new Error("Refund amount must be positive");

    const data = (await ctx.runMutation(
      internal.paymentsInternal.prepareRefundWithdrawal,
      {
        amount: args.amount,
        currency: args.currency ?? "INR",
      },
    )) as RefundWithdrawalData;

    try {
      const refund = await razorpayPost<RazorpayRefundResponse>(
        `/payments/${data.razorpayPaymentId}/refund`,
        {
          amount: toRazorpayMinorUnits(data.amount),
          speed: "normal",
          notes: {
            withdrawalId: data.withdrawalId,
            userId: data.userId,
          },
        },
      );

      await ctx.runMutation(
        internal.paymentsInternal.markRefundWithdrawalProcessed,
        {
          withdrawalId: data.withdrawalId,
          razorpayRefundId: refund.id,
        },
      );

      return {
        ok: true,
        refundId: refund.id,
        amount: fromRazorpayMinorUnits(refund.amount),
        currency: refund.currency,
        status: refund.status,
      };
    } catch (error) {
      await ctx.runMutation(internal.paymentsInternal.markRefundWithdrawalFailed, {
        withdrawalId: data.withdrawalId,
        reason: error instanceof Error ? error.message : "Razorpay refund failed",
      });
      throw error;
    }
  },
});
