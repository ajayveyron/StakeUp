import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { isScheduledDate, todayInTimeZone } from "./lib/dates";

async function requireOwnedActiveCommitment(
  ctx: MutationCtx,
  commitmentId: Id<"commitments">
) {
  const user = await requireUser(ctx);
  const commitment = await ctx.db.get(commitmentId);
  if (
    !commitment ||
    commitment.userId !== user._id ||
    commitment.status !== "active"
  ) {
    throw new Error("Commitment not found");
  }
  return { user, commitment };
}

async function replaceOrCreateUnderReview(
  ctx: MutationCtx,
  args:
    | {
        commitmentId: Id<"commitments">;
        date: string;
        proofUrl: string;
        stepCount?: undefined;
      }
    | {
        commitmentId: Id<"commitments">;
        date: string;
        stepCount: number;
        proofUrl?: undefined;
      }
) {
  const { user, commitment } = await requireOwnedActiveCommitment(
    ctx,
    args.commitmentId
  );
  const today = todayInTimeZone(commitment.timezone);

  if (args.proofUrl !== undefined && commitment.goalType !== "content") {
    throw new Error("This commitment does not accept content proof");
  }
  if (args.date > today) {
    throw new Error("Cannot submit proof for a future date");
  }
  if (!isScheduledDate(commitment, args.date)) {
    throw new Error("This date is not scheduled for this commitment");
  }

  const existing = await ctx.db
    .query("checkIns")
    .withIndex("by_commitment_date", (q) =>
      q.eq("commitmentId", commitment._id).eq("date", args.date)
    )
    .unique();

  if (existing && existing.status !== "under_review") {
    throw new Error("This check-in can no longer be changed");
  }

  const now = new Date().toISOString();
  const fields = {
    userId: user._id,
    commitmentId: commitment._id,
    date: args.date,
    proofUrl: args.proofUrl,
    stepCount: args.stepCount,
    status: "under_review" as const,
    verified: false,
    rejectionReason: undefined,
    submittedAt: now,
    reviewedAt: undefined,
    reviewerId: undefined,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }

  return await ctx.db.insert("checkIns", {
    ...fields,
    createdAt: now,
  });
}

export const submitContent = mutation({
  args: {
    commitmentId: v.id("commitments"),
    date: v.string(),
    proofUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const proofUrl = args.proofUrl.trim();
    if (!proofUrl.startsWith("http")) {
      throw new Error("Proof URL must start with http");
    }
    const checkInId = await replaceOrCreateUnderReview(ctx, {
      ...args,
      proofUrl,
    });
    await ctx.scheduler.runAfter(0, internal.slack.sendReviewNotification, {
      checkInId,
    });
    return checkInId;
  },
});

export const submitSteps = mutation({
  args: {
    commitmentId: v.id("commitments"),
    date: v.string(),
    stepCount: v.number(),
  },
  handler: async (ctx, args) => {
    const { commitment } = await requireOwnedActiveCommitment(
      ctx,
      args.commitmentId
    );
    if (commitment.goalType !== "steps") {
      throw new Error("This commitment does not accept step check-ins");
    }
    if (args.stepCount < commitment.targetPerDay) {
      throw new Error("Step count is below the daily target");
    }
    const checkInId = await replaceOrCreateUnderReview(ctx, args);
    await ctx.scheduler.runAfter(0, internal.slack.sendReviewNotification, {
      checkInId,
    });
    return checkInId;
  },
});

export const removeMine = mutation({
  args: {
    commitmentId: v.id("commitments"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, commitment } = await requireOwnedActiveCommitment(
      ctx,
      args.commitmentId
    );
    const checkIn = await ctx.db
      .query("checkIns")
      .withIndex("by_commitment_date", (q) =>
        q.eq("commitmentId", commitment._id).eq("date", args.date)
      )
      .unique();

    if (!checkIn || checkIn.userId !== user._id) return;
    if (checkIn.status !== "under_review") {
      throw new Error("Reviewed check-ins cannot be removed");
    }
    await ctx.db.delete(checkIn._id);
  },
});
