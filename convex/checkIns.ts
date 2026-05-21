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
        proofPrompt?: string;
        submissionSignature?: string;
        submissionStatement?: string;
        stepCount?: undefined;
      }
    | {
        commitmentId: Id<"commitments">;
        date: string;
        stepCount: number;
        proofUrl?: undefined;
        submissionSignature?: undefined;
        submissionStatement?: undefined;
      }
) {
  const { user, commitment } = await requireOwnedActiveCommitment(
    ctx,
    args.commitmentId
  );
  const today = todayInTimeZone(commitment.timezone);

  if (args.proofUrl !== undefined && commitment.goalType !== "content") {
    if (commitment.goalType !== "workout") {
      throw new Error("This commitment does not accept this proof");
    }
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
    proofPrompt: "proofPrompt" in args ? args.proofPrompt : undefined,
    submissionSignature:
      "submissionSignature" in args ? args.submissionSignature : undefined,
    submissionStatement:
      "submissionStatement" in args ? args.submissionStatement : undefined,
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
    submissionSignature: v.optional(v.string()),
    submissionStatement: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const proofUrl = args.proofUrl.trim();
    if (!proofUrl.startsWith("http")) {
      throw new Error("Proof URL must start with http");
    }
    const checkInId = await replaceOrCreateUnderReview(ctx, {
      ...args,
      proofUrl,
      submissionSignature: args.submissionSignature?.trim() || undefined,
      submissionStatement: args.submissionStatement?.trim() || undefined,
    });
    await ctx.scheduler.runAfter(0, internal.slack.sendReviewNotification, {
      checkInId,
    });
    return checkInId;
  },
});

export const submitWorkout = mutation({
  args: {
    commitmentId: v.id("commitments"),
    date: v.string(),
    proofUrl: v.string(),
    proofPrompt: v.optional(v.string()),
    submissionSignature: v.optional(v.string()),
    submissionStatement: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { commitment } = await requireOwnedActiveCommitment(
      ctx,
      args.commitmentId
    );
    if (commitment.goalType !== "workout") {
      throw new Error("This commitment does not accept workout proof");
    }
    const proofUrl = args.proofUrl.trim();
    if (!proofUrl.startsWith("http")) {
      throw new Error("Proof URL must start with http");
    }
    const checkInId = await replaceOrCreateUnderReview(ctx, {
      commitmentId: args.commitmentId,
      date: args.date,
      proofUrl,
      proofPrompt: args.proofPrompt?.trim() || undefined,
      submissionSignature: args.submissionSignature?.trim() || undefined,
      submissionStatement: args.submissionStatement?.trim() || undefined,
    });
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
