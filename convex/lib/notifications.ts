import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { commitmentCheckoutAmount } from "./payments";
import { getRefundPerDay } from "./dates";

type NotificationType =
  | "payment_pending"
  | "payment_confirmed"
  | "payment_discarded"
  | "slot_confirmed"
  | "manual_payout_requested"
  | "check_in_approved"
  | "check_in_rejected"
  | "manual_payout_recorded";

type NotificationInput = {
  userId: Id<"users">;
  type: NotificationType;
  title: string;
  body: string;
  commitmentId?: Id<"commitments">;
  checkInId?: Id<"checkIns">;
  route?: string;
  email?: {
    subject: string;
    body: string;
  };
  dedupeKey?: string;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

function friendlyName(user: Doc<"users"> | null) {
  return user?.displayName?.trim().split(/\s+/)[0] || "there";
}

function routeForCommitment(commitmentId: Id<"commitments">) {
  return `/commitment/${commitmentId}`;
}

export async function createUserNotification(
  ctx: MutationCtx,
  args: NotificationInput
) {
  if (args.dedupeKey) {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_user_dedupe", (q) =>
        q.eq("userId", args.userId).eq("dedupeKey", args.dedupeKey)
      )
      .unique();
    if (existing) return existing._id;
  }

  const now = new Date().toISOString();
  const notificationId = await ctx.db.insert("notifications", {
    userId: args.userId,
    type: args.type,
    title: args.title,
    body: args.body,
    commitmentId: args.commitmentId,
    checkInId: args.checkInId,
    route: args.route,
    emailSubject: args.email?.subject,
    emailBody: args.email?.body,
    dedupeKey: args.dedupeKey,
    createdAt: now,
    updatedAt: now,
  });

  if (args.email) {
    const deliveryId = await ctx.db.insert("notificationDeliveries", {
      notificationId,
      userId: args.userId,
      channel: "email",
      status: "pending",
      provider: "resend",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.notifications.sendEmailForDelivery, {
      deliveryId,
    });
  }

  return notificationId;
}

export async function notifyPaymentPending(
  ctx: MutationCtx,
  args: { user: Doc<"users">; commitment: Doc<"commitments"> }
) {
  const amount = formatMoney(
    commitmentCheckoutAmount(args.commitment),
    args.commitment.currency,
  );
  const name = friendlyName(args.user);
  await createUserNotification(ctx, {
    userId: args.user._id,
    type: "payment_pending",
    title: "Deposit not locked yet",
    body: `${args.commitment.name} is written. Lock the ${amount} refundable deposit to start the pact.`,
    commitmentId: args.commitment._id,
    route: routeForCommitment(args.commitment._id),
    dedupeKey: `payment-pending:${args.commitment._id}`,
    email: {
      subject: `Lock the money for ${args.commitment.name}`,
      body: `Hi ${name},

Your ${args.commitment.name} pact has been written and is ready for deposit payment.

Amount due: ${amount}

Open Pact Raven and lock the refundable deposit. The record starts only after deposit payment is verified.`,
    },
  });
}

export async function notifySlotConfirmed(
  ctx: MutationCtx,
  args: { user: Doc<"users"> | null; amount: number; currency: string },
) {
  if (!args.user) return;
  const amount = formatMoney(args.amount, args.currency);
  const name = friendlyName(args.user);
  await createUserNotification(ctx, {
    userId: args.user._id,
    type: "slot_confirmed",
    title: "Pact Pass ready",
    body: `One Pact Pass has been added. ${amount} is the non-refundable pass fee.`,
    route: "/profile",
    email: {
      subject: "Your Pact Pass is ready",
      body: `Hi ${name},

Your ${amount} Pact Pass payment is confirmed. You now have one unused Pact Pass.

The pass fee is non-refundable. A separate refundable deposit is collected when you start a pact.`,
    },
  });
}

export async function notifyPaymentConfirmed(
  ctx: MutationCtx,
  args: { user: Doc<"users"> | null; commitment: Doc<"commitments"> }
) {
  if (!args.user) return;
  const name = friendlyName(args.user);
  await createUserNotification(ctx, {
    userId: args.user._id,
    type: "payment_confirmed",
    title: "Money locked",
    body: `${args.commitment.name} is live. The deposit is recorded as a refundable pact liability.`,
    commitmentId: args.commitment._id,
    route: routeForCommitment(args.commitment._id),
    dedupeKey: `payment-confirmed:${args.commitment._id}`,
    email: {
      subject: `${args.commitment.name} is live`,
      body: `Hi ${name},

The deposit has been confirmed for ${args.commitment.name}. Your pact is live now.

Open Pact Raven to view your schedule and show proof on active days.`,
    },
  });
}

export async function notifyPaymentDiscarded(
  ctx: MutationCtx,
  args: { user: Doc<"users"> | null; commitment: Doc<"commitments"> }
) {
  if (!args.user) return;
  const name = friendlyName(args.user);
  await createUserNotification(ctx, {
    userId: args.user._id,
    type: "payment_discarded",
    title: "Pact archived",
    body: `${args.commitment.name} was archived before the deposit was locked.`,
    commitmentId: args.commitment._id,
    dedupeKey: `payment-discarded:${args.commitment._id}`,
    email: {
      subject: `${args.commitment.name} was archived`,
      body: `Hi ${name},

The pending deposit request for ${args.commitment.name} was archived before activation.

No pact is live for that request.`,
    },
  });
}

export async function notifyCheckInApproved(
  ctx: MutationCtx,
  args: {
    user: Doc<"users"> | null;
    commitment: Doc<"commitments">;
    checkIn: Doc<"checkIns">;
  }
) {
  if (!args.user) return;
  const amount = formatMoney(getRefundPerDay(args.commitment), args.commitment.currency);
  const name = friendlyName(args.user);
  await createUserNotification(ctx, {
    userId: args.user._id,
    type: "check_in_approved",
    title: "Successful day",
    body: `${args.commitment.name} for ${args.checkIn.date} was approved. ${amount} is now refund credit.`,
    commitmentId: args.commitment._id,
    checkInId: args.checkIn._id,
    route: routeForCommitment(args.commitment._id),
    dedupeKey: `check-in-approved:${args.checkIn._id}`,
    email: {
      subject: `Successful day: ${args.commitment.name}`,
      body: `Hi ${name},

Your ${args.commitment.name} submission for ${args.checkIn.date} was approved.

${amount} is now a refund credit.`,
    },
  });
}

export async function notifyCheckInRejected(
  ctx: MutationCtx,
  args: {
    user: Doc<"users"> | null;
    commitment: Doc<"commitments">;
    checkIn: Doc<"checkIns">;
    reason: string;
  }
) {
  if (!args.user) return;
  const amount = formatMoney(getRefundPerDay(args.commitment), args.commitment.currency);
  const name = friendlyName(args.user);
  await createUserNotification(ctx, {
    userId: args.user._id,
    type: "check_in_rejected",
    title: "Pact not met",
    body: `${args.commitment.name} for ${args.checkIn.date} was not accepted. Reason: ${args.reason}`,
    commitmentId: args.commitment._id,
    checkInId: args.checkIn._id,
    route: routeForCommitment(args.commitment._id),
    dedupeKey: `check-in-rejected:${args.checkIn._id}`,
    email: {
      subject: `Pact not met: ${args.commitment.name}`,
      body: `Hi ${name},

Your ${args.commitment.name} submission for ${args.checkIn.date} was not accepted.

Reason: ${args.reason}

${amount} has been forfeited to your selected charity for this day.`,
    },
  });
}

export async function notifyManualPayoutRecorded(
  ctx: MutationCtx,
  args: {
    user: Doc<"users"> | null;
    amount: number;
    currency: string;
    note?: string;
  }
) {
  if (!args.user) return;
  const amount = formatMoney(args.amount, args.currency);
  const name = friendlyName(args.user);
  const noteLine = args.note ? ` Note: ${args.note}` : "";
  await createUserNotification(ctx, {
    userId: args.user._id,
    type: "manual_payout_recorded",
    title: "Refund recorded",
    body: `${amount} was marked refunded to you.${noteLine}`,
    route: "/profile",
    email: {
      subject: `Refund recorded: ${amount}`,
      body: `Hi ${name},

A manual UPI refund of ${amount} was recorded for your Pact Raven account.${noteLine}`,
    },
  });
}

export async function notifyManualPayoutRequested(
  ctx: MutationCtx,
  args: {
    user: Doc<"users"> | null;
    amount: number;
    currency: string;
  },
) {
  if (!args.user) return;
  const amount = formatMoney(args.amount, args.currency);
  await createUserNotification(ctx, {
    userId: args.user._id,
    type: "manual_payout_requested",
    title: "Refund request recorded",
    body: `${amount} refund credit is waiting for manual UPI payout.`,
    route: "/profile",
  });
}
