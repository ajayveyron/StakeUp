import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import {
  addDays,
  daysBetween,
  getRefundPerDay,
  getScheduledDates,
  todayInTimeZone,
} from "./lib/dates";
import {
  ensureDepositLedgerEntry,
  insertManualPayoutLedgerEntry,
} from "./lib/ledger";
import {
  notifyManualPayoutRecorded,
  notifyPaymentConfirmed,
} from "./lib/notifications";
import {
  approveCheckInForReview,
  rejectCheckInForReview,
} from "./lib/review";

function userLabel(user: Doc<"users"> | null) {
  return user?.email ?? user?.displayName ?? "Unknown user";
}

async function payoutBalanceByCurrency(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
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

  return [...balances.entries()]
    .map(([currency, amount]) => ({
      currency,
      amount: Math.round(Math.max(0, amount) * 100) / 100,
    }))
    .filter((balance) => balance.amount > 0);
}

async function pendingReviewRows(ctx: QueryCtx) {
  const checkIns = await ctx.db
    .query("checkIns")
    .withIndex("by_status_date", (q) => q.eq("status", "under_review"))
    .take(100);

  const rows = [];
  for (const checkIn of checkIns) {
    const commitment = await ctx.db.get(checkIn.commitmentId);
    const user = await ctx.db.get(checkIn.userId);
    if (!commitment || !user || commitment.status !== "active") continue;
    rows.push({
      checkIn: {
        id: checkIn._id,
        date: checkIn.date,
        proofUrl: checkIn.proofUrl,
        proofPrompt: checkIn.proofPrompt,
        submissionSignature: checkIn.submissionSignature,
        submissionStatement: checkIn.submissionStatement,
        stepCount: checkIn.stepCount,
        submittedAt: checkIn.submittedAt ?? checkIn.createdAt,
        status: checkIn.status,
      },
      commitment: {
        id: commitment._id,
        name: commitment.name,
        goalType: commitment.goalType,
        targetPerDay: commitment.targetPerDay,
        currency: commitment.currency,
        refundPerDay: getRefundPerDay(commitment),
      },
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  }

  return rows.sort((a, b) =>
    a.checkIn.submittedAt.localeCompare(b.checkIn.submittedAt)
  );
}

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await pendingReviewRows(ctx);
  },
});

export const adminOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const pendingPaymentCommitments = await ctx.db
      .query("commitments")
      .withIndex("by_status", (q) => q.eq("status", "pending_payment"))
      .take(100);

    const pendingPayments = [];
    for (const commitment of pendingPaymentCommitments) {
      const user = await ctx.db.get(commitment.userId);
      pendingPayments.push({
        commitment: {
          id: commitment._id,
          name: commitment.name,
          goalType: commitment.goalType,
          startDate: commitment.startDate,
          endDate: commitment.endDate,
          pactAmount: commitment.pactAmount,
          currency: commitment.currency,
          createdAt: commitment.createdAt,
        },
        user: {
          id: commitment.userId,
          label: userLabel(user),
          email: user?.email,
          phone: user?.phone,
          displayName: user?.displayName,
        },
      });
    }

    const activeCommitments = await ctx.db
      .query("commitments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(300);

    const todayCheckIns = [];
    for (const commitment of activeCommitments) {
      const today = todayInTimeZone(commitment.timezone);
      if (!getScheduledDates(commitment).includes(today)) continue;

      const user = await ctx.db.get(commitment.userId);
      const checkIn = await ctx.db
        .query("checkIns")
        .withIndex("by_commitment_date", (q) =>
          q.eq("commitmentId", commitment._id).eq("date", today)
        )
        .unique();

      todayCheckIns.push({
        date: today,
        status: checkIn?.status ?? "due",
        submittedAt: checkIn?.submittedAt,
        checkInId: checkIn?._id,
        proofUrl: checkIn?.proofUrl,
        proofPrompt: checkIn?.proofPrompt,
        submissionSignature: checkIn?.submissionSignature,
        submissionStatement: checkIn?.submissionStatement,
        stepCount: checkIn?.stepCount,
        commitment: {
          id: commitment._id,
          name: commitment.name,
          goalType: commitment.goalType,
          targetPerDay: commitment.targetPerDay,
          currency: commitment.currency,
          refundPerDay: getRefundPerDay(commitment),
        },
        user: {
          id: commitment.userId,
          label: userLabel(user),
          email: user?.email,
          phone: user?.phone,
          displayName: user?.displayName,
        },
      });
    }

    const pendingReviews = await pendingReviewRows(ctx);

    const users = await ctx.db.query("users").take(300);
    const payoutBalances = [];
    for (const user of users) {
      const balances = await payoutBalanceByCurrency(ctx, user._id);
      for (const balance of balances) {
        payoutBalances.push({
          user: {
            id: user._id,
            label: userLabel(user),
            email: user.email,
            phone: user.phone,
            displayName: user.displayName,
          },
          ...balance,
        });
      }
    }

    const recentLedgerEntries = await ctx.db
      .query("walletLedgerEntries")
      .withIndex("by_created_at")
      .order("desc")
      .take(25);

    const recentLedger = [];
    for (const entry of recentLedgerEntries) {
      const user = await ctx.db.get(entry.userId);
      const commitment = entry.commitmentId
        ? await ctx.db.get(entry.commitmentId)
        : null;
      recentLedger.push({
        id: entry._id,
        type: entry.type,
        amount: entry.amount,
        currency: entry.currency,
        destination: entry.destination,
        externalReference: entry.externalReference,
        note: entry.note,
        createdAt: entry.createdAt,
        user: {
          id: entry.userId,
          label: userLabel(user),
          email: user?.email,
        },
        commitment: commitment
          ? {
              id: commitment._id,
              name: commitment.name,
            }
          : undefined,
      });
    }

    return {
      pendingPayments: pendingPayments.sort((a, b) =>
        a.commitment.createdAt.localeCompare(b.commitment.createdAt)
      ),
      todayCheckIns: todayCheckIns.sort((a, b) =>
        a.user.label.localeCompare(b.user.label)
      ),
      pendingReviews,
      payoutBalances: payoutBalances.sort((a, b) => b.amount - a.amount),
      recentLedger,
    };
  },
});

export const confirmPayment = mutation({
  args: {
    commitmentId: v.id("commitments"),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireAdmin(ctx);
    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment || commitment.status === "deleted") {
      throw new Error("Commitment not found");
    }
    if (commitment.status !== "pending_payment") {
      throw new Error("Payment is not pending for this commitment");
    }

    const now = new Date().toISOString();
    const reference = args.reference?.trim() || undefined;
    const note = args.note?.trim() || undefined;
    const today = todayInTimeZone(commitment.timezone);
    const startsBeforeConfirmation = commitment.startDate < today;
    const shiftedStartDate = startsBeforeConfirmation
      ? today
      : commitment.startDate;
    const shiftedEndDate = startsBeforeConfirmation
      ? addDays(
          commitment.endDate,
          daysBetween(commitment.startDate, today) - 1
        )
      : commitment.endDate;

    await ctx.db.patch(commitment._id, {
      status: "active",
      startDate: shiftedStartDate,
      endDate: shiftedEndDate,
      durationDays: daysBetween(shiftedStartDate, shiftedEndDate),
      paymentConfirmedAt: now,
      paymentConfirmedBy: reviewer._id,
      paymentReference: reference,
      paymentNote: note,
      updatedAt: now,
    });

    await ensureDepositLedgerEntry(ctx, {
      userId: commitment.userId,
      commitmentId: commitment._id,
      amount: commitment.pactAmount,
      currency: commitment.currency,
      externalReference: reference,
      note,
      createdBy: reviewer._id,
    });

    await notifyPaymentConfirmed(ctx, {
      user: await ctx.db.get(commitment.userId),
      commitment,
    });

    return { ok: true };
  },
});

export const recordManualPayout = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireAdmin(ctx);
    if (args.amount <= 0) throw new Error("Payout amount must be positive");

    const balances = await payoutBalanceByCurrency(ctx, args.userId);
    const balance =
      balances.find((item) => item.currency === args.currency)?.amount ?? 0;
    if (args.amount > balance + 0.01) {
      throw new Error("Payout amount exceeds available balance");
    }

    await insertManualPayoutLedgerEntry(ctx, {
      userId: args.userId,
      amount: Math.round(args.amount * 100) / 100,
      currency: args.currency,
      externalReference: args.reference?.trim() || undefined,
      note: args.note?.trim() || undefined,
      createdBy: reviewer._id,
    });

    await notifyManualPayoutRecorded(ctx, {
      user: await ctx.db.get(args.userId),
      amount: Math.round(args.amount * 100) / 100,
      currency: args.currency,
      note: args.note?.trim() || undefined,
    });

    return { ok: true };
  },
});

export const approve = mutation({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, args) => {
    const reviewer = await requireAdmin(ctx);
    return await approveCheckInForReview(ctx, {
      checkInId: args.checkInId,
      reviewer: {
        reviewerId: reviewer._id,
        reviewerSource: "app",
        reviewerLabel: reviewer.email ?? reviewer.displayName,
      },
    });
  },
});

export const reject = mutation({
  args: {
    checkInId: v.id("checkIns"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireAdmin(ctx);
    return await rejectCheckInForReview(ctx, {
      checkInId: args.checkInId,
      reason: args.reason,
      reviewer: {
        reviewerId: reviewer._id,
        reviewerSource: "app",
        reviewerLabel: reviewer.email ?? reviewer.displayName,
      },
    });
  },
});
