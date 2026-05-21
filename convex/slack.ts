import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import {
  addDays,
  daysBetween,
  getRefundPerDay,
  todayInTimeZone,
} from "./lib/dates";
import { ensureDepositLedgerEntry } from "./lib/ledger";
import { charityName, type CharityDestination } from "./lib/charities";
import {
  notifyPaymentConfirmed,
  notifyPaymentDiscarded,
} from "./lib/notifications";
import { approveCheckInForReview, rejectCheckInForReview } from "./lib/review";

type ReviewNotificationData = {
  checkInId: Id<"checkIns">;
  date: string;
  proofUrl?: string;
  proofPrompt?: string;
  submissionStatement?: string;
  submittedAt: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  commitmentName: string;
  goalType: "content" | "workout";
  targetPerDay: number;
  startDate: string;
  endDate: string;
  forfeitDestination: CharityDestination;
  pactAmount: number;
  currency: string;
  refundPerDay: number;
};

type PaymentNotificationData = {
  commitmentId: Id<"commitments">;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  commitmentName: string;
  goalType: "content" | "workout";
  targetPerDay: number;
  startDate: string;
  endDate: string;
  forfeitDestination: CharityDestination;
  currency: string;
  pactAmount: number;
  refundPerDay: number;
};

function slackReviewerLabel(args: {
  slackUserId: string;
  username?: string;
  name?: string;
}) {
  return args.username || args.name || `Slack ${args.slackUserId}`;
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function userLabel(args: {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}) {
  return args.userName || args.userEmail || args.userPhone || "Unknown user";
}

function contactLabel(args: { userEmail?: string; userPhone?: string }) {
  return (
    [args.userEmail, args.userPhone].filter(Boolean).join("\n") || "No contact"
  );
}

function goalLabel(args: {
  goalType: "content" | "workout";
  targetPerDay: number;
}) {
  return args.goalType === "workout"
    ? "Workout proof on scheduled days"
    : `${args.targetPerDay.toLocaleString("en-IN")} content proof/day`;
}

function forfeitLabel(args: {
  forfeitDestination: CharityDestination;
}) {
  return charityName(args.forfeitDestination);
}

async function slotBalance(ctx: any, userId: Id<"users">) {
  const entries = await ctx.db
    .query("pactSlotLedgerEntries")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  return entries.reduce((total: number, entry: { quantity: number }) => {
    return total + entry.quantity;
  }, 0);
}

async function consumeSlotFromSlack(
  ctx: any,
  args: {
    userId: Id<"users">;
    commitmentId: Id<"commitments">;
    externalReference: string;
    reviewer: string;
  },
) {
  const existing = await ctx.db
    .query("pactSlotLedgerEntries")
    .withIndex("by_commitment", (q: any) =>
      q.eq("commitmentId", args.commitmentId),
    )
    .filter((q: any) => q.eq(q.field("type"), "slot_consumed"))
    .first();
  if (existing) return existing._id;
  if ((await slotBalance(ctx, args.userId)) < 1) {
    throw new Error("User has no unused pact slot");
  }
  return await ctx.db.insert("pactSlotLedgerEntries", {
    userId: args.userId,
    commitmentId: args.commitmentId,
    type: "slot_consumed",
    quantity: -1,
    externalReference: args.externalReference,
    note: `Pact slot consumed from Slack by ${args.reviewer}`,
    createdAt: new Date().toISOString(),
  });
}

async function callSlack(method: string, payload: Record<string, unknown>) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return { skipped: true, reason: "SLACK_BOT_TOKEN missing" };

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as { ok?: boolean; error?: string };

  if (!response.ok || !result.ok) {
    throw new Error(
      `Slack ${method} failed: ${result.error ?? response.status}`,
    );
  }

  return result;
}

export const getReviewNotificationData = internalQuery({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, args) => {
    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn || checkIn.status !== "under_review") return null;
    const commitment = await ctx.db.get(checkIn.commitmentId);
    const user = await ctx.db.get(checkIn.userId);
    if (!commitment || !user || commitment.status !== "active") return null;

    return {
      checkInId: checkIn._id,
      date: checkIn.date,
      proofUrl: checkIn.proofUrl,
      proofPrompt: checkIn.proofPrompt,
      submissionStatement: checkIn.submissionStatement,
      submittedAt: checkIn.submittedAt ?? checkIn.createdAt,
      userEmail: user.email,
      userName: user.displayName,
      userPhone: user.phone,
      commitmentName: commitment.name,
      goalType: commitment.goalType,
      targetPerDay: commitment.targetPerDay,
      startDate: commitment.startDate,
      endDate: commitment.endDate,
      forfeitDestination: commitment.forfeitDestination,
      pactAmount: commitment.pactAmount,
      currency: commitment.currency,
      refundPerDay: getRefundPerDay(commitment),
    };
  },
});

export const getPaymentNotificationData = internalQuery({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, args) => {
    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment || commitment.status !== "pending_deposit") return null;
    const user = await ctx.db.get(commitment.userId);
    if (!user) return null;

    return {
      commitmentId: commitment._id,
      userEmail: user.email,
      userName: user.displayName,
      userPhone: user.phone,
      commitmentName: commitment.name,
      goalType: commitment.goalType,
      targetPerDay: commitment.targetPerDay,
      startDate: commitment.startDate,
      endDate: commitment.endDate,
      forfeitDestination: commitment.forfeitDestination,
      currency: commitment.currency,
      pactAmount: commitment.pactAmount,
      refundPerDay: getRefundPerDay(commitment),
    };
  },
});

export const sendReviewNotification = internalAction({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, args): Promise<unknown> => {
    const channel = process.env.SLACK_REVIEW_CHANNEL_ID;
    if (!channel) {
      return { skipped: true, reason: "SLACK_REVIEW_CHANNEL_ID missing" };
    }

    const data = (await ctx.runQuery(
      (internal as any).slack.getReviewNotificationData,
      args,
    )) as ReviewNotificationData | null;
    if (!data) return { skipped: true, reason: "check-in not pending" };

    const proofText =
      data.goalType === "content"
        ? (data.proofUrl ?? "No URL")
        : [data.proofUrl ?? "No proof URL", data.proofPrompt ? `Prompt: ${data.proofPrompt}` : undefined]
            .filter(Boolean)
            .join("\n");
    const signedStatement = data.submissionStatement
      ? `\n\n*Signed statement*\n${data.submissionStatement}`
      : "";
    const user = userLabel(data);
    const contact = contactLabel(data);
    const payout = formatMoney(data.currency, data.refundPerDay);

    return await callSlack("chat.postMessage", {
      channel,
      text: `Proof review pending: ${data.commitmentName}`,
      unfurl_links: false,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Proof review pending",
            emoji: false,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*User*\n${user}`,
            },
            {
              type: "mrkdwn",
              text: `*Contact*\n${contact}`,
            },
            {
              type: "mrkdwn",
              text: `*Pact*\n${data.commitmentName}`,
            },
            {
              type: "mrkdwn",
              text: `*Goal*\n${goalLabel(data)}`,
            },
            {
              type: "mrkdwn",
              text: `*Check-in date*\n${data.date}`,
            },
            {
              type: "mrkdwn",
              text: `*Refund credit on approval*\n${payout}`,
            },
            {
              type: "mrkdwn",
              text: `*Pact amount*\n${formatMoney(data.currency, data.pactAmount)}`,
            },
            {
              type: "mrkdwn",
              text: `*If rejected*\n${forfeitLabel(data)}`,
            },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              data.goalType === "content"
                ? `*Proof URL*\n${proofText}${signedStatement}`
                : `*Workout proof*\n${proofText}${signedStatement}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "Approve only after proof matches the pact rules. Approved credits wait for manual UPI payout.",
            },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Approve proof",
                emoji: false,
              },
              style: "primary",
              action_id: "approve_check_in",
              value: data.checkInId,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Reject", emoji: false },
              style: "danger",
              action_id: "reject_check_in",
              value: data.checkInId,
            },
          ],
        },
      ],
    });
  },
});

export const sendPaymentNotification = internalAction({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, args): Promise<unknown> => {
    const channel =
      process.env.SLACK_PAYMENT_CHANNEL_ID ??
      process.env.SLACK_REVIEW_CHANNEL_ID;
    if (!channel) {
      return { skipped: true, reason: "Slack payment channel missing" };
    }

    const data = (await ctx.runQuery(
      (internal as any).slack.getPaymentNotificationData,
      args,
    )) as PaymentNotificationData | null;
    if (!data) return { skipped: true, reason: "commitment not pending" };
    const user = userLabel(data);
    const contact = contactLabel(data);

    return await callSlack("chat.postMessage", {
      channel,
      text: `Deposit pending: ${data.commitmentName}`,
      unfurl_links: false,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Deposit pending",
            emoji: false,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*User*\n${user}`,
            },
            {
              type: "mrkdwn",
              text: `*Contact*\n${contact}`,
            },
            {
              type: "mrkdwn",
              text: `*Pact*\n${data.commitmentName}`,
            },
            {
              type: "mrkdwn",
              text: `*Goal*\n${goalLabel(data)}`,
            },
            {
              type: "mrkdwn",
              text: `*Refundable deposit to collect*\n${formatMoney(data.currency, data.pactAmount)}`,
            },
            {
              type: "mrkdwn",
              text: `*Schedule*\n${data.startDate} to ${data.endDate}`,
            },
            {
              type: "mrkdwn",
              text: `*Refund credit per approval*\n${formatMoney(data.currency, data.refundPerDay)}`,
            },
            {
              type: "mrkdwn",
              text: `*If forfeited*\n${forfeitLabel(data)}`,
            },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "Activate only after the pact deposit is verified. Discard archives this pending pact.",
            },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Activate pact", emoji: false },
              style: "primary",
              action_id: "activate_commitment",
              value: data.commitmentId,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Discard", emoji: false },
              style: "danger",
              action_id: "discard_commitment",
              value: data.commitmentId,
            },
          ],
        },
      ],
    });
  },
});

export const approveFromSlack = internalMutation({
  args: {
    checkInId: v.id("checkIns"),
    slackUserId: v.string(),
    username: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await approveCheckInForReview(ctx, {
      checkInId: args.checkInId,
      reviewer: {
        reviewerSource: "slack",
        reviewerLabel: slackReviewerLabel(args),
      },
    });
  },
});

export const rejectFromSlack = internalMutation({
  args: {
    checkInId: v.id("checkIns"),
    reason: v.string(),
    slackUserId: v.string(),
    username: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await rejectCheckInForReview(ctx, {
      checkInId: args.checkInId,
      reason: args.reason,
      reviewer: {
        reviewerSource: "slack",
        reviewerLabel: slackReviewerLabel(args),
      },
    });
  },
});

export const activateCommitmentFromSlack = internalMutation({
  args: {
    commitmentId: v.id("commitments"),
    slackUserId: v.string(),
    username: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment || commitment.status === "deleted") {
      throw new Error("Commitment not found");
    }
    if (commitment.status === "active") return { ok: true };
    if (commitment.status !== "pending_deposit") {
      throw new Error("Deposit is not pending for this commitment");
    }

    const now = new Date().toISOString();
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
    const reviewer = slackReviewerLabel(args);

    await ctx.db.patch(commitment._id, {
      status: "active",
      startDate: shiftedStartDate,
      endDate: shiftedEndDate,
      durationDays: daysBetween(shiftedStartDate, shiftedEndDate),
      paymentConfirmedAt: now,
      paymentReference: `slack:${args.slackUserId}`,
      paymentNote: `Activated from Slack by ${reviewer}`,
      slotConsumedAt: now,
      updatedAt: now,
    });

    await consumeSlotFromSlack(ctx, {
      userId: commitment.userId,
      commitmentId: commitment._id,
      externalReference: `slack:${args.slackUserId}`,
      reviewer,
    });

    await ensureDepositLedgerEntry(ctx, {
      userId: commitment.userId,
      commitmentId: commitment._id,
      amount: commitment.pactAmount,
      currency: commitment.currency,
      externalReference: `slack:${args.slackUserId}`,
      note: `Refundable pact deposit liability confirmed from Slack by ${reviewer}`,
    });

    await notifyPaymentConfirmed(ctx, {
      user: await ctx.db.get(commitment.userId),
      commitment,
    });

    return { ok: true };
  },
});

export const discardCommitmentFromSlack = internalMutation({
  args: {
    commitmentId: v.id("commitments"),
    slackUserId: v.string(),
    username: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment) throw new Error("Commitment not found");
    if (commitment.status === "deleted") return { ok: true };
    if (commitment.status !== "pending_deposit") {
      throw new Error("Only pending-deposit pacts can be discarded");
    }

    const reviewer = slackReviewerLabel(args);
    const now = new Date().toISOString();
    await ctx.db.patch(commitment._id, {
      status: "deleted",
      deletedAt: now,
      paymentNote: `Discarded from Slack by ${reviewer}`,
      updatedAt: now,
    });

    await notifyPaymentDiscarded(ctx, {
      user: await ctx.db.get(commitment.userId),
      commitment,
    });

    return { ok: true };
  },
});

export function asCheckInId(value: string) {
  return value as Id<"checkIns">;
}

export function asCommitmentId(value: string) {
  return value as Id<"commitments">;
}
