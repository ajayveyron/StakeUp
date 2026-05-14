import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getRefundPerDay } from "./dates";

type NotificationType =
  | "payment_pending"
  | "payment_confirmed"
  | "payment_discarded"
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
  const amount = formatMoney(args.commitment.pactAmount, args.commitment.currency);
  const name = friendlyName(args.user);
  await createUserNotification(ctx, {
    userId: args.user._id,
    type: "payment_pending",
    title: "Payment request created",
    body: `${args.commitment.name} is waiting for manual payment confirmation. Amount due: ${amount}.`,
    commitmentId: args.commitment._id,
    route: routeForCommitment(args.commitment._id),
    dedupeKey: `payment-pending:${args.commitment._id}`,
    email: {
      subject: `Payment request created for ${args.commitment.name}`,
      body: `Hi ${name},

Your ${args.commitment.name} pact has been created and is waiting for manual payment confirmation.

Amount due: ${amount}

Open Pact Raven and use the UPI payment step for this pact. Your check-ins will start after an admin confirms the payment.`,
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
    title: "Payment received",
    body: `${args.commitment.name} is active now. Check-ins are unlocked.`,
    commitmentId: args.commitment._id,
    route: routeForCommitment(args.commitment._id),
    dedupeKey: `payment-confirmed:${args.commitment._id}`,
    email: {
      subject: `${args.commitment.name} is active`,
      body: `Hi ${name},

Payment has been confirmed for ${args.commitment.name}. Your pact is active now.

Open Pact Raven to view your schedule and submit check-ins on active days.`,
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
    title: "Payment request discarded",
    body: `${args.commitment.name} was archived without activation.`,
    commitmentId: args.commitment._id,
    dedupeKey: `payment-discarded:${args.commitment._id}`,
    email: {
      subject: `${args.commitment.name} was archived`,
      body: `Hi ${name},

The pending payment request for ${args.commitment.name} was archived without activation.

No pact is active for that request.`,
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
    title: "Check-in approved + paid",
    body: `${args.commitment.name} for ${args.checkIn.date} was approved. ${amount} has been marked paid to you.`,
    commitmentId: args.commitment._id,
    checkInId: args.checkIn._id,
    route: routeForCommitment(args.commitment._id),
    dedupeKey: `check-in-approved:${args.checkIn._id}`,
    email: {
      subject: `Check-in approved: ${args.commitment.name}`,
      body: `Hi ${name},

Your ${args.commitment.name} check-in for ${args.checkIn.date} was approved.

${amount} has been marked paid to you.`,
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
    title: "Check-in rejected",
    body: `${args.commitment.name} for ${args.checkIn.date} was rejected. Reason: ${args.reason}`,
    commitmentId: args.commitment._id,
    checkInId: args.checkIn._id,
    route: routeForCommitment(args.commitment._id),
    dedupeKey: `check-in-rejected:${args.checkIn._id}`,
    email: {
      subject: `Check-in rejected: ${args.commitment.name}`,
      body: `Hi ${name},

Your ${args.commitment.name} check-in for ${args.checkIn.date} was rejected.

Reason: ${args.reason}

${amount} has been forfeited for this check-in.`,
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
    title: "Payout recorded",
    body: `${amount} was marked paid to you.${noteLine}`,
    route: "/profile",
    email: {
      subject: `Payout recorded: ${amount}`,
      body: `Hi ${name},

A manual payout of ${amount} was recorded for your Pact Raven account.${noteLine}`,
    },
  });
}
