import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { daysBetween } from "./lib/dates";
import {
  LEGACY_PLATFORM_FEE_AMOUNT,
  MAX_PACT_AMOUNT_INR,
  MIN_PACT_AMOUNT_INR,
} from "./lib/payments";

const goalType = v.union(v.literal("content"), v.literal("workout"));
const forfeitDestination = v.union(
  v.literal("akshaya_patra"),
  v.literal("goonj"),
  v.literal("cry"),
  v.literal("helpage_india"),
  v.literal("wildlife_sos"),
);

async function serializeCommitment(
  ctx: QueryCtx,
  commitment: Doc<"commitments">,
) {
  const checkIns = await ctx.db
    .query("checkIns")
    .withIndex("by_commitment", (q) => q.eq("commitmentId", commitment._id))
    .collect();

  return {
    id: commitment._id,
    name: commitment.name,
    goalType: commitment.goalType,
    daysOfWeek: commitment.daysOfWeek,
    targetPerDay: commitment.targetPerDay,
    durationDays: commitment.durationDays,
    pactAmount: commitment.pactAmount,
    platformFeeAmount:
      commitment.platformFeeAmount ?? LEGACY_PLATFORM_FEE_AMOUNT,
    currency: commitment.currency,
    forfeitDestination: commitment.forfeitDestination,
    startDate: commitment.startDate,
    endDate: commitment.endDate,
    timezone: commitment.timezone,
    status: commitment.status,
    slotConsumedAt: commitment.slotConsumedAt,
    paymentConfirmedAt: commitment.paymentConfirmedAt,
    paymentReference: commitment.paymentReference,
    paymentNote: commitment.paymentNote,
    endedAt: commitment.endedAt,
    earlyEndReason: commitment.earlyEndReason,
    earlyEndSettlementStatus: commitment.earlyEndSettlementStatus,
    createdAt: commitment.createdAt,
    updatedAt: commitment.updatedAt,
    checkIns: await Promise.all(
      checkIns
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(async (checkIn) => ({
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
          status: checkIn.status,
          verified: checkIn.verified,
          rejectionReason: checkIn.rejectionReason,
          reviewedAt: checkIn.reviewedAt,
          submittedAt: checkIn.submittedAt ?? checkIn.createdAt,
        })),
    ),
  };
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return await Promise.all(
      commitments
        .filter((commitment) => commitment.status !== "deleted")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((commitment) => serializeCommitment(ctx, commitment)),
    );
  },
});

export const getMine = query({
  args: { id: v.id("commitments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const commitment = await ctx.db.get(args.id);
    if (
      !commitment ||
      commitment.userId !== user._id ||
      commitment.status === "deleted"
    ) {
      return null;
    }
    return await serializeCommitment(ctx, commitment);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    goalType,
    daysOfWeek: v.array(v.number()),
    targetPerDay: v.number(),
    durationDays: v.number(),
    pactAmount: v.number(),
    currency: v.string(),
    forfeitDestination,
    startDate: v.string(),
    endDate: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.name.trim().length === 0) {
      throw new Error("Name is required");
    }
    if (args.daysOfWeek.length === 0) {
      throw new Error("Choose at least one scheduled day");
    }
    if (args.targetPerDay <= 0) {
      throw new Error("Target must be greater than zero");
    }
    if (args.pactAmount <= 0) {
      throw new Error("Pact amount must be greater than zero");
    }
    if (
      args.currency === "INR" &&
      (args.pactAmount < MIN_PACT_AMOUNT_INR ||
        args.pactAmount > MAX_PACT_AMOUNT_INR)
    ) {
      throw new Error(
        `Pact amount must be between INR ${MIN_PACT_AMOUNT_INR} and INR ${MAX_PACT_AMOUNT_INR}`,
      );
    }
    if (args.startDate > args.endDate) {
      throw new Error("Start date must be before end date");
    }

    const now = new Date().toISOString();
    const durationDays = daysBetween(args.startDate, args.endDate);

    const commitmentId = await ctx.db.insert("commitments", {
      userId: user._id,
      name: args.name.trim(),
      goalType: args.goalType,
      daysOfWeek: [...new Set(args.daysOfWeek)].sort((a, b) => a - b),
      targetPerDay: args.targetPerDay,
      durationDays,
      pactAmount: args.pactAmount,
      platformFeeAmount: LEGACY_PLATFORM_FEE_AMOUNT,
      currency: args.currency,
      forfeitDestination: args.forfeitDestination,
      startDate: args.startDate,
      endDate: args.endDate,
      timezone: args.timezone,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    return commitmentId;
  },
});

export const endEarly = mutation({
  args: {
    id: v.id("commitments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const commitment = await ctx.db.get(args.id);
    if (
      !commitment ||
      commitment.userId !== user._id ||
      commitment.status !== "active"
    ) {
      throw new Error("Active pact not found");
    }

    const now = new Date().toISOString();
    const reason = args.reason?.trim() || undefined;
    await ctx.db.patch(commitment._id, {
      status: "ended",
      endedAt: now,
      earlyEndReason: reason,
      earlyEndSettlementStatus: "pending",
      updatedAt: now,
    });

    const existing = await ctx.db
      .query("earlyEndSettlementRequests")
      .withIndex("by_commitment", (q) => q.eq("commitmentId", commitment._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (!existing) {
      await ctx.db.insert("earlyEndSettlementRequests", {
        userId: user._id,
        commitmentId: commitment._id,
        status: "pending",
        reason,
        requestedAt: now,
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});

export const deleteMine = mutation({
  args: { id: v.id("commitments") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const commitment = await ctx.db.get(args.id);
    if (!commitment || commitment.userId !== user._id) {
      throw new Error("Commitment not found");
    }
    await ctx.db.patch(args.id, {
      status: "deleted",
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});
