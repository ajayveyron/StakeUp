import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { getRefundPerDay } from "./lib/dates";
import {
  approveCheckInForReview,
  rejectCheckInForReview,
} from "./lib/review";

type ReviewNotificationData = {
  checkInId: Id<"checkIns">;
  date: string;
  proofUrl?: string;
  stepCount?: number;
  submittedAt: string;
  userEmail?: string;
  userName?: string;
  commitmentName: string;
  goalType: "content" | "steps";
  targetPerDay: number;
  currency: string;
  refundPerDay: number;
};

type PaymentNotificationData = {
  commitmentId: Id<"commitments">;
  userEmail?: string;
  userName?: string;
  commitmentName: string;
  goalType: "content" | "steps";
  startDate: string;
  endDate: string;
  currency: string;
  pactAmount: number;
};

function slackReviewerLabel(args: {
  slackUserId: string;
  username?: string;
  name?: string;
}) {
  return args.username || args.name || `Slack ${args.slackUserId}`;
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
    throw new Error(`Slack ${method} failed: ${result.error ?? response.status}`);
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
      stepCount: checkIn.stepCount,
      submittedAt: checkIn.submittedAt ?? checkIn.createdAt,
      userEmail: user.email,
      userName: user.displayName,
      commitmentName: commitment.name,
      goalType: commitment.goalType,
      targetPerDay: commitment.targetPerDay,
      currency: commitment.currency,
      refundPerDay: getRefundPerDay(commitment),
    };
  },
});

export const getPaymentNotificationData = internalQuery({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, args) => {
    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment || commitment.status !== "pending_payment") return null;
    const user = await ctx.db.get(commitment.userId);
    if (!user) return null;

    return {
      commitmentId: commitment._id,
      userEmail: user.email,
      userName: user.displayName,
      commitmentName: commitment.name,
      goalType: commitment.goalType,
      startDate: commitment.startDate,
      endDate: commitment.endDate,
      currency: commitment.currency,
      pactAmount: commitment.pactAmount,
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
      args
    )) as ReviewNotificationData | null;
    if (!data) return { skipped: true, reason: "check-in not pending" };

    const proofText =
      data.goalType === "content"
        ? data.proofUrl ?? "No URL"
        : `${data.stepCount?.toLocaleString("en-IN") ?? "Not provided"} / ${data.targetPerDay.toLocaleString("en-IN")} steps`;

    return await callSlack("chat.postMessage", {
      channel,
      text: `Pact Raven review: ${data.commitmentName}`,
      unfurl_links: false,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Pact Raven review",
            emoji: false,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*User*\n${data.userEmail ?? data.userName ?? "Unknown"}`,
            },
            {
              type: "mrkdwn",
              text: `*Pact*\n${data.commitmentName}`,
            },
            {
              type: "mrkdwn",
              text: `*Date*\n${data.date}`,
            },
            {
              type: "mrkdwn",
              text: `*Refund*\n${data.currency} ${data.refundPerDay}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              data.goalType === "content"
                ? `*Proof URL*\n${proofText}`
                : `*Steps*\n${proofText}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Approve", emoji: false },
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
      args
    )) as PaymentNotificationData | null;
    if (!data) return { skipped: true, reason: "commitment not pending" };

    return await callSlack("chat.postMessage", {
      channel,
      text: `Pact Raven payment pending: ${data.commitmentName}`,
      unfurl_links: false,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Pact payment pending",
            emoji: false,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*User*\n${data.userEmail ?? data.userName ?? "Unknown"}`,
            },
            {
              type: "mrkdwn",
              text: `*Pact*\n${data.commitmentName}`,
            },
            {
              type: "mrkdwn",
              text: `*Amount*\n${data.currency} ${data.pactAmount}`,
            },
            {
              type: "mrkdwn",
              text: `*Schedule*\n${data.startDate} to ${data.endDate}`,
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "Confirm the UPI payment from the admin dashboard before this pact becomes active.",
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

export function asCheckInId(value: string) {
  return value as Id<"checkIns">;
}
