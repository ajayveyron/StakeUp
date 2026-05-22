import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAdmin, requireAdminIdentity } from "./lib/auth";
import {
  addDays,
  daysBetween,
  getRefundPerDay,
  getScheduledDates,
  todayInTimeZone,
} from "./lib/dates";
import {
  ensureDepositLedgerEntry,
  insertCharityTransferLedgerEntry,
  insertManualPayoutLedgerEntry,
} from "./lib/ledger";
import {
  notifyManualPayoutRecorded,
  notifyPaymentConfirmed,
} from "./lib/notifications";
import { calculateAdminMetrics } from "./lib/adminMetrics";
import { consumeSlotForCommitment } from "./lib/pactPasses";
import { approveCheckInForReview, rejectCheckInForReview } from "./lib/review";

function userLabel(user: Doc<"users"> | null) {
  return user?.email ?? user?.displayName ?? "Unknown user";
}

async function payoutBalanceByCurrency(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  options: { reservePendingRequests?: boolean } = {},
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

  if (options.reservePendingRequests) {
    const pendingRequests = await ctx.db
      .query("manualPayoutRequests")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "pending"),
      )
      .collect();
    for (const request of pendingRequests) {
      const current = balances.get(request.currency) ?? 0;
      balances.set(request.currency, current - request.amount);
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
        proofUrl:
          checkIn.proofUrl ??
          (checkIn.proofStorageId
            ? await ctx.storage.getUrl(checkIn.proofStorageId)
            : undefined) ??
          undefined,
        proofStorageId: checkIn.proofStorageId,
        proofPrompt: checkIn.proofPrompt,
        proofLocation: checkIn.proofLocation,
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
        phone: user.phone,
        whatsappNumber: user.whatsappNumber,
        displayName: user.displayName,
      },
    });
  }

  return rows.sort((a, b) =>
    a.checkIn.submittedAt.localeCompare(b.checkIn.submittedAt),
  );
}

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);
    return await pendingReviewRows(ctx);
  },
});

export const adminOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminIdentity(ctx);
    const today = todayInTimeZone("Asia/Kolkata");
    const last30SinceDate = addDays(today, -29);
    const last30SinceIso = `${last30SinceDate}T00:00:00.000Z`;
    const allUsers = await ctx.db.query("users").collect();
    const allCommitments = await ctx.db.query("commitments").collect();
    const allCheckIns = await ctx.db.query("checkIns").collect();
    const allLedgerEntries = await ctx.db.query("walletLedgerEntries").collect();
    const allPayoutRequests = await ctx.db.query("manualPayoutRequests").collect();

    const pendingDepositCommitments = await ctx.db
      .query("commitments")
      .withIndex("by_status", (q) => q.eq("status", "pending_deposit"))
      .take(100);

    const pendingPayments = [];
    for (const commitment of pendingDepositCommitments) {
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
          whatsappNumber: user?.whatsappNumber,
          displayName: user?.displayName,
        },
      });
    }

    const pendingSlotPurchases = await ctx.db
      .query("pactSlotPurchases")
      .withIndex("by_status", (q) => q.eq("status", "pending_payment"))
      .take(100);
    const slotPurchases = [];
    for (const purchase of pendingSlotPurchases) {
      const user = await ctx.db.get(purchase.userId);
      slotPurchases.push({
        id: purchase._id,
        amount: purchase.amount,
        currency: purchase.currency,
        razorpayOrderId: purchase.razorpayOrderId,
        createdAt: purchase.createdAt,
        user: {
          id: purchase.userId,
          label: userLabel(user),
          email: user?.email,
          phone: user?.phone,
          whatsappNumber: user?.whatsappNumber,
          displayName: user?.displayName,
        },
      });
    }

    const activeCommitments = allCommitments
      .filter((commitment) => commitment.status === "active")
      .slice(0, 300);

    const todayCheckIns = [];
    for (const commitment of activeCommitments) {
      const today = todayInTimeZone(commitment.timezone);
      if (!getScheduledDates(commitment).includes(today)) continue;

      const user = await ctx.db.get(commitment.userId);
      const checkIn = await ctx.db
        .query("checkIns")
        .withIndex("by_commitment_date", (q) =>
          q.eq("commitmentId", commitment._id).eq("date", today),
        )
        .unique();

      todayCheckIns.push({
        date: today,
        status: checkIn?.status ?? "due",
        submittedAt: checkIn?.submittedAt,
        checkInId: checkIn?._id,
        proofUrl:
          checkIn?.proofUrl ??
          (checkIn?.proofStorageId
            ? await ctx.storage.getUrl(checkIn.proofStorageId)
            : undefined) ??
          undefined,
        proofStorageId: checkIn?.proofStorageId,
        proofPrompt: checkIn?.proofPrompt,
        proofLocation: checkIn?.proofLocation,
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
          whatsappNumber: user?.whatsappNumber,
          displayName: user?.displayName,
        },
      });
    }

    const pendingReviews = await pendingReviewRows(ctx);

    const payoutBalances = [];
    for (const user of allUsers.slice(0, 300)) {
      const balances = await payoutBalanceByCurrency(ctx, user._id, {
        reservePendingRequests: true,
      });
      for (const balance of balances) {
        payoutBalances.push({
          user: {
            id: user._id,
            label: userLabel(user),
            email: user.email,
            phone: user.phone,
            whatsappNumber: user.whatsappNumber,
            displayName: user.displayName,
          },
          ...balance,
        });
      }
    }

    const payoutRequestsRaw = allPayoutRequests
      .filter((request) => request.status === "pending")
      .slice(0, 100);
    const payoutRequests = [];
    for (const request of payoutRequestsRaw) {
      const user = await ctx.db.get(request.userId);
      payoutRequests.push({
        id: request._id,
        amount: request.amount,
        currency: request.currency,
        upiId: request.upiId,
        payeeName: request.payeeName,
        createdAt: request.createdAt,
        note: request.note,
        user: {
          id: request.userId,
          label: userLabel(user),
          email: user?.email,
          phone: user?.phone,
          whatsappNumber: user?.whatsappNumber,
          displayName: user?.displayName,
        },
      });
    }

    const earlyEndRequestsRaw = await ctx.db
      .query("earlyEndSettlementRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(100);
    const earlyEndSettlements = [];
    for (const request of earlyEndRequestsRaw) {
      const user = await ctx.db.get(request.userId);
      const commitment = await ctx.db.get(request.commitmentId);
      if (!commitment) continue;
      const existingLedger = await ctx.db
        .query("walletLedgerEntries")
        .withIndex("by_commitment", (q) => q.eq("commitmentId", commitment._id))
        .collect();
      const alreadyResolved = existingLedger.reduce((sum, entry) => {
        if (entry.type === "approved_refund" || entry.type === "forfeited") {
          return sum + entry.amount;
        }
        return sum;
      }, 0);
      const remainingDeposit =
        Math.round(Math.max(0, commitment.pactAmount - alreadyResolved) * 100) /
        100;
      earlyEndSettlements.push({
        id: request._id,
        reason: request.reason,
        requestedAt: request.requestedAt,
        commitment: {
          id: commitment._id,
          name: commitment.name,
          pactAmount: commitment.pactAmount,
          remainingDeposit,
          currency: commitment.currency,
        },
        user: {
          id: request.userId,
          label: userLabel(user),
          email: user?.email,
          phone: user?.phone,
          whatsappNumber: user?.whatsappNumber,
          displayName: user?.displayName,
        },
      });
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

    const metrics = calculateAdminMetrics({
      users: allUsers.map((user) => ({
        id: user._id,
        role: user.role,
        createdAt: user.createdAt,
      })),
      commitments: allCommitments.map((commitment) => ({
        id: commitment._id,
        userId: commitment.userId,
        daysOfWeek: commitment.daysOfWeek,
        startDate: commitment.startDate,
        endDate: commitment.endDate,
        status: commitment.status,
        pactAmount: commitment.pactAmount,
        currency: commitment.currency,
        createdAt: commitment.createdAt,
        paymentConfirmedAt: commitment.paymentConfirmedAt,
        earlyEndSettlementStatus: commitment.earlyEndSettlementStatus,
        earlyEndReason: commitment.earlyEndReason,
      })),
      checkIns: allCheckIns.map((checkIn) => ({
        id: checkIn._id,
        commitmentId: checkIn.commitmentId,
        date: checkIn.date,
        status: checkIn.status,
        submittedAt: checkIn.submittedAt,
        reviewedAt: checkIn.reviewedAt,
        createdAt: checkIn.createdAt,
      })),
      ledgerEntries: allLedgerEntries.map((entry) => ({
        userId: entry.userId,
        commitmentId: entry.commitmentId,
        amount: entry.amount,
        currency: entry.currency,
        type: entry.type,
        destination: entry.destination,
        createdAt: entry.createdAt,
      })),
      payoutRequests: allPayoutRequests.map((request) => ({
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        status: request.status,
        createdAt: request.createdAt,
      })),
      today,
      last30SinceDate,
      last30SinceIso,
    });

    return {
      metrics,
      slotPurchases: slotPurchases.sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
      pendingPayments: pendingPayments.sort((a, b) =>
        a.commitment.createdAt.localeCompare(b.commitment.createdAt),
      ),
      todayCheckIns: todayCheckIns.sort((a, b) =>
        a.user.label.localeCompare(b.user.label),
      ),
      pendingReviews,
      payoutRequests: payoutRequests.sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
      earlyEndSettlements: earlyEndSettlements.sort((a, b) =>
        a.requestedAt.localeCompare(b.requestedAt),
      ),
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
    if (
      commitment.status !== "pending_deposit" &&
      commitment.status !== "pending_payment" &&
      commitment.status !== "draft"
    ) {
      throw new Error("Deposit is not pending for this commitment");
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
          daysBetween(commitment.startDate, today) - 1,
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

    await consumeSlotForCommitment(ctx, {
      userId: commitment.userId,
      commitmentId: commitment._id,
      externalReference: reference,
      createdBy: reviewer._id,
      note: "Pact Pass consumed by admin deposit confirmation.",
      coveredNote: "Covered first Pact Pass consumed by admin deposit confirmation.",
    });

    await ensureDepositLedgerEntry(ctx, {
      userId: commitment.userId,
      commitmentId: commitment._id,
      amount: commitment.pactAmount,
      currency: commitment.currency,
      externalReference: reference,
      note: note ?? "Refundable pact deposit liability confirmed by admin.",
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
    requestId: v.optional(v.id("manualPayoutRequests")),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireAdmin(ctx);
    if (args.amount <= 0) throw new Error("Payout amount must be positive");
    const amount = Math.round(args.amount * 100) / 100;
    const currency = args.currency.trim().toUpperCase();

    const request = args.requestId ? await ctx.db.get(args.requestId) : null;
    if (args.requestId) {
      if (!request || request.status !== "pending") {
        throw new Error("Pending payout request not found");
      }
      if (request.userId !== args.userId) {
        throw new Error("Payout request does not belong to this user");
      }
      if (request.currency !== currency) {
        throw new Error("Payout request currency does not match");
      }
      if (Math.abs(request.amount - amount) > 0.01) {
        throw new Error("Payout amount must match the request");
      }
    }

    const balances = await payoutBalanceByCurrency(ctx, args.userId, {
      reservePendingRequests: !request,
    });
    const balance =
      balances.find((item) => item.currency === currency)?.amount ?? 0;
    if (amount > balance + 0.01) {
      throw new Error("Payout amount exceeds available balance");
    }

    await insertManualPayoutLedgerEntry(ctx, {
      userId: args.userId,
      amount,
      currency,
      externalReference: args.reference?.trim() || undefined,
      note:
        args.note?.trim() ||
        (request?.upiId
          ? `Manual UPI payout to ${request.payeeName ? `${request.payeeName} ` : ""}${request.upiId}`
          : undefined),
      createdBy: reviewer._id,
    });

    if (request) {
      const now = new Date().toISOString();
      await ctx.db.patch(request._id, {
        status: "processed",
        externalReference: args.reference?.trim() || undefined,
        note: args.note?.trim() || request.note,
        processedAt: now,
        processedBy: reviewer._id,
        updatedAt: now,
      });
    }

    await notifyManualPayoutRecorded(ctx, {
      user: await ctx.db.get(args.userId),
      amount,
      currency,
      note: args.note?.trim() || undefined,
    });

    return { ok: true };
  },
});

export const resolveEarlyEndSettlement = mutation({
  args: {
    requestId: v.id("earlyEndSettlementRequests"),
    refundAmount: v.number(),
    forfeitAmount: v.number(),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireAdmin(ctx);
    if (args.refundAmount < 0 || args.forfeitAmount < 0) {
      throw new Error("Settlement amounts cannot be negative");
    }
    if (args.refundAmount > 0) {
      throw new Error(
        "Early-end settlements must forfeit the remaining deposit to charity",
      );
    }

    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") {
      throw new Error("Settlement request not found");
    }
    const commitment = await ctx.db.get(request.commitmentId);
    if (!commitment) throw new Error("Commitment not found");
    const existingLedger = await ctx.db
      .query("walletLedgerEntries")
      .withIndex("by_commitment", (q) => q.eq("commitmentId", commitment._id))
      .collect();
    const alreadyResolved = existingLedger.reduce((sum, entry) => {
      if (entry.type === "approved_refund" || entry.type === "forfeited") {
        return sum + entry.amount;
      }
      return sum;
    }, 0);
    const remainingDeposit =
      Math.round(Math.max(0, commitment.pactAmount - alreadyResolved) * 100) /
      100;
    if (Math.abs(args.forfeitAmount - remainingDeposit) > 0.01) {
      throw new Error("Forfeit amount must equal the remaining pact deposit");
    }
    const now = new Date().toISOString();
    if (remainingDeposit === 0 && args.forfeitAmount === 0) {
      await ctx.db.patch(request._id, {
        status: "resolved",
        refundAmount: 0,
        forfeitAmount: 0,
        reference: args.reference?.trim() || undefined,
        note: args.note?.trim() || "Early-end settlement had no remaining deposit.",
        resolvedAt: now,
        resolvedBy: reviewer._id,
        updatedAt: now,
      });
      await ctx.db.patch(commitment._id, {
        earlyEndSettlementStatus: "resolved",
        updatedAt: now,
      });
      return { ok: true };
    }

    if (args.forfeitAmount > 0) {
      await ctx.db.insert("walletLedgerEntries", {
        userId: request.userId,
        commitmentId: commitment._id,
        amount: Math.round(args.forfeitAmount * 100) / 100,
        currency: commitment.currency,
        type: "forfeited",
        destination: "charity",
        externalReference: args.reference?.trim() || undefined,
        note: args.note?.trim() || "Early-end settlement forfeited to charity.",
        createdBy: reviewer._id,
        createdAt: now,
      });
    }

    await ctx.db.patch(request._id, {
      status: "resolved",
      refundAmount: 0,
      forfeitAmount: Math.round(args.forfeitAmount * 100) / 100,
      reference: args.reference?.trim() || undefined,
      note: args.note?.trim() || undefined,
      resolvedAt: now,
      resolvedBy: reviewer._id,
      updatedAt: now,
    });
    await ctx.db.patch(commitment._id, {
      earlyEndSettlementStatus: "resolved",
      updatedAt: now,
    });

    return { ok: true };
  },
});

export const recordCharityTransfer = mutation({
  args: {
    userId: v.id("users"),
    commitmentId: v.optional(v.id("commitments")),
    amount: v.number(),
    currency: v.string(),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireAdmin(ctx);
    if (args.amount <= 0) throw new Error("Transfer amount must be positive");
    await insertCharityTransferLedgerEntry(ctx, {
      userId: args.userId,
      commitmentId: args.commitmentId,
      amount: Math.round(args.amount * 100) / 100,
      currency: args.currency,
      externalReference: args.reference?.trim() || undefined,
      note: args.note?.trim() || undefined,
      createdBy: reviewer._id,
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
