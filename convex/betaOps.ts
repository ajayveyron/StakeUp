import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { addDays, todayInTimeZone } from "./lib/dates";

const betaCommitmentCategory = v.union(
  v.literal("fasting"),
  v.literal("exercise"),
  v.literal("content"),
  v.literal("custom"),
);
const betaSubmissionStatus = v.union(
  v.literal("submitted"),
  v.literal("approved"),
  v.literal("missed"),
  v.literal("skipped"),
);

const INITIAL_CYCLE_START = "2026-05-01";
const INITIAL_CYCLE_END = "2026-05-31";
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_CURRENCY = "INR";

type BetaLedgerType = Doc<"betaLedgerEntries">["type"];

const INITIAL_COHORT = [
  {
    user: { slug: "jayanth", name: "Jayanth" },
    commitments: [
      {
        slug: "jayanth-fasting-2026-05",
        title: "Fasting",
        category: "fasting" as const,
        frequencyLabel: "2 times a week",
        frequencyPerWeek: 2,
        daysOfWeek: [1, 4],
        plannedSubmissions: 10,
        totalAmount: 1000,
        amountPerSubmission: 100,
        notes: "Initial schedule assumes Monday and Thursday.",
      },
      {
        slug: "jayanth-exercise-2026-05",
        title: "Exercise",
        category: "exercise" as const,
        frequencyLabel: "5 times a week",
        frequencyPerWeek: 5,
        daysOfWeek: [1, 2, 3, 4, 5],
        plannedSubmissions: 20,
        totalAmount: 1000,
        amountPerSubmission: 50,
        notes: "Initial schedule assumes weekdays.",
      },
    ],
  },
  {
    user: { slug: "chetan", name: "Chetan" },
    commitments: [
      {
        slug: "chetan-posting-2026-05",
        title: "Posting",
        category: "content" as const,
        frequencyLabel: "2 times a week",
        frequencyPerWeek: 2,
        daysOfWeek: [2, 5],
        plannedSubmissions: 10,
        totalAmount: 1000,
        amountPerSubmission: 100,
        notes: "Initial schedule assumes Tuesday and Friday.",
      },
    ],
  },
  {
    user: { slug: "shubham", name: "Shubham" },
    commitments: [
      {
        slug: "shubham-exercise-2026-05",
        title: "Exercise",
        category: "exercise" as const,
        frequencyLabel: "5 times a week",
        frequencyPerWeek: 5,
        daysOfWeek: [1, 2, 3, 4, 5],
        plannedSubmissions: 20,
        totalAmount: 3000,
        amountPerSubmission: 150,
        notes: "Initial schedule assumes weekdays.",
      },
    ],
  },
];

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

function dayOfWeek(date: string) {
  return new Date(`${date}T00:00:00`).getDay();
}

function scheduledDates(commitment: Doc<"betaCommitments">) {
  const dates: string[] = [];
  let cursor = commitment.cycleStartDate;

  while (cursor <= commitment.cycleEndDate) {
    if (commitment.daysOfWeek.includes(dayOfWeek(cursor))) {
      dates.push(cursor);
    }
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function nextOpenDueDate(
  commitment: Doc<"betaCommitments">,
  submissions: Doc<"betaSubmissions">[],
  today: string,
) {
  const takenDates = new Set(
    submissions
      .filter((submission) => submission.status !== "skipped")
      .map((submission) => submission.date),
  );

  return scheduledDates(commitment).find(
    (date) => date >= today && !takenDates.has(date),
  );
}

function userLabel(user: Doc<"betaUsers"> | null) {
  return user?.name ?? "Unknown user";
}

async function commitmentLedgerEntries(
  ctx: QueryCtx | MutationCtx,
  commitmentId: Id<"betaCommitments">,
) {
  return await ctx.db
    .query("betaLedgerEntries")
    .withIndex("by_commitment", (q) => q.eq("commitmentId", commitmentId))
    .collect();
}

function ledgerTotals(entries: Doc<"betaLedgerEntries">[]) {
  const totals = {
    paidReceived: 0,
    refundEarned: 0,
    refundPaid: 0,
    forfeited: 0,
    adjustments: 0,
  };

  for (const entry of entries) {
    if (entry.type === "payment_received") totals.paidReceived += entry.amount;
    if (entry.type === "refund_earned") totals.refundEarned += entry.amount;
    if (entry.type === "refund_paid") totals.refundPaid += entry.amount;
    if (entry.type === "forfeited") totals.forfeited += entry.amount;
    if (entry.type === "adjustment") totals.adjustments += entry.amount;
  }

  return {
    paidReceived: roundMoney(totals.paidReceived),
    refundEarned: roundMoney(totals.refundEarned),
    refundPaid: roundMoney(totals.refundPaid),
    forfeited: roundMoney(totals.forfeited),
    adjustments: roundMoney(totals.adjustments),
    pendingRefund: roundMoney(
      Math.max(0, totals.refundEarned + totals.adjustments - totals.refundPaid),
    ),
  };
}

function submissionCounts(submissions: Doc<"betaSubmissions">[]) {
  return {
    submitted: submissions.filter(
      (submission) => submission.status === "submitted",
    ).length,
    approved: submissions.filter(
      (submission) => submission.status === "approved",
    ).length,
    missed: submissions.filter((submission) => submission.status === "missed")
      .length,
    skipped: submissions.filter((submission) => submission.status === "skipped")
      .length,
  };
}

async function upsertBetaUser(
  ctx: MutationCtx,
  args: { slug: string; name: string; email?: string; phone?: string },
) {
  const now = new Date().toISOString();
  const existing = await ctx.db
    .query("betaUsers")
    .withIndex("by_slug", (q) => q.eq("slug", args.slug))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      name: args.name,
      email: args.email,
      phone: args.phone,
      status: "active",
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("betaUsers", {
    slug: args.slug,
    name: args.name,
    email: args.email,
    phone: args.phone,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

async function upsertBetaCommitment(
  ctx: MutationCtx,
  args: {
    userId: Id<"betaUsers">;
    slug: string;
    title: string;
    category: Doc<"betaCommitments">["category"];
    frequencyLabel: string;
    frequencyPerWeek: number;
    daysOfWeek: number[];
    plannedSubmissions: number;
    totalAmount: number;
    amountPerSubmission: number;
    notes?: string;
  },
) {
  const now = new Date().toISOString();
  const existing = await ctx.db
    .query("betaCommitments")
    .withIndex("by_slug", (q) => q.eq("slug", args.slug))
    .unique();

  const fields = {
    userId: args.userId,
    title: args.title,
    category: args.category,
    frequencyLabel: args.frequencyLabel,
    frequencyPerWeek: args.frequencyPerWeek,
    daysOfWeek: args.daysOfWeek,
    plannedSubmissions: args.plannedSubmissions,
    totalAmount: args.totalAmount,
    amountPerSubmission: args.amountPerSubmission,
    currency: DEFAULT_CURRENCY,
    cycleStartDate: INITIAL_CYCLE_START,
    cycleEndDate: INITIAL_CYCLE_END,
    timezone: DEFAULT_TIMEZONE,
    status: "active" as const,
    notes: args.notes,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }

  return await ctx.db.insert("betaCommitments", {
    slug: args.slug,
    ...fields,
    createdAt: now,
  });
}

async function ensureSeedPaymentEntry(
  ctx: MutationCtx,
  args: {
    adminId: Id<"users">;
    userId: Id<"betaUsers">;
    commitmentId: Id<"betaCommitments">;
    amount: number;
  },
) {
  const existing = await ctx.db
    .query("betaLedgerEntries")
    .withIndex("by_commitment", (q) => q.eq("commitmentId", args.commitmentId))
    .filter((q) => q.eq(q.field("type"), "payment_received"))
    .first();

  const fields = {
    userId: args.userId,
    commitmentId: args.commitmentId,
    type: "payment_received" as const,
    amount: args.amount,
    currency: DEFAULT_CURRENCY,
    occurredAt: INITIAL_CYCLE_START,
    externalReference: "initial-beta-seed",
    note: "Initial paid beta amount.",
    createdBy: args.adminId,
  };

  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }

  return await ctx.db.insert("betaLedgerEntries", {
    ...fields,
    createdAt: new Date().toISOString(),
  });
}

async function ensureSubmissionLedgerEntry(
  ctx: MutationCtx,
  args: {
    adminId: Id<"users">;
    userId: Id<"betaUsers">;
    commitmentId: Id<"betaCommitments">;
    submissionId: Id<"betaSubmissions">;
    type: Extract<BetaLedgerType, "refund_earned" | "forfeited">;
    amount: number;
    occurredAt: string;
    note?: string;
  },
) {
  const existing = await ctx.db
    .query("betaLedgerEntries")
    .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
    .filter((q) => q.eq(q.field("type"), args.type))
    .first();

  if (existing) return existing._id;

  return await ctx.db.insert("betaLedgerEntries", {
    userId: args.userId,
    commitmentId: args.commitmentId,
    submissionId: args.submissionId,
    type: args.type,
    amount: args.amount,
    currency: DEFAULT_CURRENCY,
    occurredAt: args.occurredAt,
    note: args.note,
    createdBy: args.adminId,
    createdAt: new Date().toISOString(),
  });
}

export const seedInitialBetaCohort = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    const seededCommitments = [];

    for (const seedUser of INITIAL_COHORT) {
      const userId = await upsertBetaUser(ctx, seedUser.user);
      for (const seedCommitment of seedUser.commitments) {
        const commitmentId = await upsertBetaCommitment(ctx, {
          userId,
          ...seedCommitment,
        });
        await ensureSeedPaymentEntry(ctx, {
          adminId: admin._id,
          userId,
          commitmentId,
          amount: seedCommitment.totalAmount,
        });
        seededCommitments.push(commitmentId);
      }
    }

    return { ok: true, commitments: seededCommitments.length };
  },
});

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const today = todayInTimeZone(DEFAULT_TIMEZONE);
    const users = await ctx.db.query("betaUsers").collect();
    const commitments = await ctx.db.query("betaCommitments").collect();
    const activeCommitments = commitments.filter(
      (commitment) => commitment.status !== "deleted",
    );

    const rows = [];
    const upcoming = [];

    for (const commitment of activeCommitments) {
      const user = await ctx.db.get(commitment.userId);
      const submissions = await ctx.db
        .query("betaSubmissions")
        .withIndex("by_commitment", (q) => q.eq("commitmentId", commitment._id))
        .collect();
      const ledger = await commitmentLedgerEntries(ctx, commitment._id);
      const counts = submissionCounts(submissions);
      const totals = ledgerTotals(ledger);
      const remainingSubmissions = Math.max(
        0,
        commitment.plannedSubmissions -
          counts.approved -
          counts.missed -
          counts.skipped,
      );
      const nextDueDate =
        commitment.status === "active"
          ? nextOpenDueDate(commitment, submissions, today)
          : undefined;
      const remainingPotentialRefund = roundMoney(
        remainingSubmissions * commitment.amountPerSubmission,
      );

      rows.push({
        id: commitment._id,
        slug: commitment.slug,
        title: commitment.title,
        category: commitment.category,
        status: commitment.status,
        frequencyLabel: commitment.frequencyLabel,
        frequencyPerWeek: commitment.frequencyPerWeek,
        daysOfWeek: commitment.daysOfWeek,
        plannedSubmissions: commitment.plannedSubmissions,
        scheduledSubmissions: scheduledDates(commitment).length,
        amountPerSubmission: commitment.amountPerSubmission,
        totalAmount: commitment.totalAmount,
        currency: commitment.currency,
        cycleStartDate: commitment.cycleStartDate,
        cycleEndDate: commitment.cycleEndDate,
        nextDueDate,
        remainingSubmissions,
        remainingPotentialRefund,
        notes: commitment.notes,
        user: {
          id: commitment.userId,
          name: userLabel(user),
          slug: user?.slug,
          email: user?.email,
          phone: user?.phone,
        },
        counts,
        totals,
        recentSubmissions: submissions
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 5)
          .map((submission) => ({
            id: submission._id,
            date: submission.date,
            status: submission.status,
            proofUrl: submission.proofUrl,
            note: submission.note,
          })),
      });

      if (nextDueDate) {
        upcoming.push({
          commitmentId: commitment._id,
          date: nextDueDate,
          title: commitment.title,
          amountPerSubmission: commitment.amountPerSubmission,
          currency: commitment.currency,
          user: {
            id: commitment.userId,
            name: userLabel(user),
          },
        });
      }
    }

    const recentLedgerEntries = await ctx.db
      .query("betaLedgerEntries")
      .withIndex("by_created_at")
      .order("desc")
      .take(50);
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
        occurredAt: entry.occurredAt,
        createdAt: entry.createdAt,
        externalReference: entry.externalReference,
        note: entry.note,
        user: {
          id: entry.userId,
          name: userLabel(user),
        },
        commitment: commitment
          ? {
              id: commitment._id,
              title: commitment.title,
            }
          : undefined,
      });
    }

    const totals = rows.reduce(
      (acc, row) => {
        acc.paidReceived += row.totals.paidReceived;
        acc.refundEarned += row.totals.refundEarned;
        acc.refundPaid += row.totals.refundPaid;
        acc.pendingRefund += row.totals.pendingRefund;
        acc.forfeited += row.totals.forfeited;
        acc.remainingPotentialRefund += row.remainingPotentialRefund;
        acc.remainingSubmissions += row.remainingSubmissions;
        acc.approvedSubmissions += row.counts.approved;
        acc.missedSubmissions += row.counts.missed;
        acc.pendingSubmissions += row.counts.submitted;
        return acc;
      },
      {
        paidReceived: 0,
        refundEarned: 0,
        refundPaid: 0,
        pendingRefund: 0,
        forfeited: 0,
        remainingPotentialRefund: 0,
        remainingSubmissions: 0,
        approvedSubmissions: 0,
        missedSubmissions: 0,
        pendingSubmissions: 0,
      },
    );

    return {
      today,
      isSeeded: activeCommitments.length > 0,
      totals: {
        paidReceived: roundMoney(totals.paidReceived),
        refundEarned: roundMoney(totals.refundEarned),
        refundPaid: roundMoney(totals.refundPaid),
        pendingRefund: roundMoney(totals.pendingRefund),
        forfeited: roundMoney(totals.forfeited),
        remainingPotentialRefund: roundMoney(totals.remainingPotentialRefund),
        remainingSubmissions: totals.remainingSubmissions,
        approvedSubmissions: totals.approvedSubmissions,
        missedSubmissions: totals.missedSubmissions,
        pendingSubmissions: totals.pendingSubmissions,
        activeUsers: users.filter((user) => user.status === "active").length,
        activeCommitments: activeCommitments.length,
      },
      commitments: rows.sort((a, b) =>
        `${a.user.name}:${a.title}`.localeCompare(`${b.user.name}:${b.title}`),
      ),
      upcoming: upcoming.sort((a, b) => a.date.localeCompare(b.date)),
      recentLedger: recentLedger.sort((a, b) =>
        (b.occurredAt ?? b.createdAt).localeCompare(
          a.occurredAt ?? a.createdAt,
        ),
      ),
    };
  },
});

export const recordPaymentReceived = mutation({
  args: {
    commitmentId: v.id("betaCommitments"),
    amount: v.number(),
    occurredAt: v.string(),
    externalReference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.amount <= 0) throw new Error("Payment amount must be positive");

    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment || commitment.status === "deleted") {
      throw new Error("Commitment not found");
    }

    await ctx.db.insert("betaLedgerEntries", {
      userId: commitment.userId,
      commitmentId: commitment._id,
      type: "payment_received",
      amount: roundMoney(args.amount),
      currency: commitment.currency,
      occurredAt: args.occurredAt,
      externalReference: args.externalReference?.trim() || undefined,
      note: args.note?.trim() || undefined,
      createdBy: admin._id,
      createdAt: new Date().toISOString(),
    });

    return { ok: true };
  },
});

export const recordSubmission = mutation({
  args: {
    commitmentId: v.id("betaCommitments"),
    date: v.string(),
    status: betaSubmissionStatus,
    proofUrl: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment || commitment.status === "deleted") {
      throw new Error("Commitment not found");
    }

    const existing = await ctx.db
      .query("betaSubmissions")
      .withIndex("by_commitment_date", (q) =>
        q.eq("commitmentId", commitment._id).eq("date", args.date),
      )
      .unique();

    if (existing && existing.status !== args.status) {
      throw new Error(
        `Submission for ${args.date} is already recorded as ${existing.status}`,
      );
    }

    const now = new Date().toISOString();
    const fields = {
      userId: commitment.userId,
      commitmentId: commitment._id,
      date: args.date,
      status: args.status,
      proofUrl: args.proofUrl?.trim() || undefined,
      note: args.note?.trim() || undefined,
      submittedAt:
        args.status === "submitted" || args.status === "approved"
          ? now
          : undefined,
      reviewedAt:
        args.status === "approved" ||
        args.status === "missed" ||
        args.status === "skipped"
          ? now
          : undefined,
      createdBy: admin._id,
      updatedAt: now,
    };

    const submissionId = existing
      ? existing._id
      : await ctx.db.insert("betaSubmissions", {
          ...fields,
          createdAt: now,
        });

    if (existing) {
      await ctx.db.patch(existing._id, fields);
    }

    if (args.status === "approved") {
      await ensureSubmissionLedgerEntry(ctx, {
        adminId: admin._id,
        userId: commitment.userId,
        commitmentId: commitment._id,
        submissionId,
        type: "refund_earned",
        amount: commitment.amountPerSubmission,
        occurredAt: args.date,
        note: args.note?.trim() || undefined,
      });
    } else if (args.status === "missed") {
      await ensureSubmissionLedgerEntry(ctx, {
        adminId: admin._id,
        userId: commitment.userId,
        commitmentId: commitment._id,
        submissionId,
        type: "forfeited",
        amount: commitment.amountPerSubmission,
        occurredAt: args.date,
        note: args.note?.trim() || undefined,
      });
    }

    return { ok: true, submissionId };
  },
});

export const recordRefundPaid = mutation({
  args: {
    commitmentId: v.id("betaCommitments"),
    amount: v.number(),
    occurredAt: v.string(),
    externalReference: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.amount <= 0) throw new Error("Refund amount must be positive");

    const commitment = await ctx.db.get(args.commitmentId);
    if (!commitment || commitment.status === "deleted") {
      throw new Error("Commitment not found");
    }

    await ctx.db.insert("betaLedgerEntries", {
      userId: commitment.userId,
      commitmentId: commitment._id,
      type: "refund_paid",
      amount: roundMoney(args.amount),
      currency: commitment.currency,
      occurredAt: args.occurredAt,
      externalReference: args.externalReference?.trim() || undefined,
      note: args.note?.trim() || undefined,
      createdBy: admin._id,
      createdAt: new Date().toISOString(),
    });

    return { ok: true };
  },
});
