import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import {
  isAfterDailyProofDeadline,
  isScheduledDate,
  todayInTimeZone,
} from "./lib/dates";
import { normalizeContentProofUrl } from "./lib/proofUrls";

const proofLocation = v.object({
  latitude: v.number(),
  longitude: v.number(),
  accuracy: v.optional(v.number()),
  capturedAt: v.string(),
});

type ProofLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
};

function normalizeProofLocation(location: ProofLocation): ProofLocation {
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new Error("Workout proof location is invalid");
  }
  if (
    location.accuracy !== undefined &&
    (!Number.isFinite(location.accuracy) || location.accuracy < 0)
  ) {
    throw new Error("Workout proof location accuracy is invalid");
  }
  if (!location.capturedAt.trim()) {
    throw new Error("Workout proof location timestamp is required");
  }

  return {
    latitude: Math.round(location.latitude * 1_000_000) / 1_000_000,
    longitude: Math.round(location.longitude * 1_000_000) / 1_000_000,
    accuracy:
      location.accuracy === undefined
        ? undefined
        : Math.round(location.accuracy * 10) / 10,
    capturedAt: location.capturedAt,
  };
}

async function requireOwnedActiveCommitment(
  ctx: MutationCtx,
  commitmentId: Id<"commitments">,
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
        expectedGoalType: "content";
        proofUrl: string;
        proofStorageId?: undefined;
        proofPrompt?: string;
        submissionSignature?: string;
        submissionStatement?: string;
        stepCount?: undefined;
      }
    | {
        commitmentId: Id<"commitments">;
        date: string;
        expectedGoalType: "workout";
        proofUrl?: undefined;
        proofStorageId: Id<"_storage">;
        proofPrompt: string;
        proofLocation: ProofLocation;
        submissionSignature?: string;
        submissionStatement?: string;
        stepCount?: undefined;
      },
) {
  const { user, commitment } = await requireOwnedActiveCommitment(
    ctx,
    args.commitmentId,
  );
  const today = todayInTimeZone(commitment.timezone);

  if (commitment.goalType !== args.expectedGoalType) {
    throw new Error("This commitment does not accept this proof");
  }
  if (
    args.expectedGoalType === "workout" &&
    !args.proofStorageId
  ) {
    throw new Error("Workout proof must include a fresh camera upload");
  }
  if (args.date > today) {
    throw new Error("Cannot submit proof for a future date");
  }
  if (isAfterDailyProofDeadline(args.date, commitment.timezone)) {
    throw new Error("The proof deadline has passed");
  }
  if (!isScheduledDate(commitment, args.date)) {
    throw new Error("This date is not scheduled for this commitment");
  }

  const existing = await ctx.db
    .query("checkIns")
    .withIndex("by_commitment_date", (q) =>
      q.eq("commitmentId", commitment._id).eq("date", args.date),
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
    proofStorageId: args.proofStorageId,
    proofPrompt: "proofPrompt" in args ? args.proofPrompt : undefined,
    proofLocation: "proofLocation" in args ? args.proofLocation : undefined,
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
    const proofUrl = normalizeContentProofUrl(args.proofUrl);
    const checkInId = await replaceOrCreateUnderReview(ctx, {
      ...args,
      expectedGoalType: "content",
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
    proofStorageId: v.id("_storage"),
    proofPrompt: v.string(),
    proofLocation,
    submissionSignature: v.optional(v.string()),
    submissionStatement: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const proofPrompt = args.proofPrompt.trim();
    if (!proofPrompt) {
      throw new Error("Workout proof must include the daily pose prompt");
    }
    const normalizedLocation = normalizeProofLocation(args.proofLocation);
    const checkInId = await replaceOrCreateUnderReview(ctx, {
      commitmentId: args.commitmentId,
      date: args.date,
      expectedGoalType: "workout",
      proofStorageId: args.proofStorageId,
      proofPrompt,
      proofLocation: normalizedLocation,
      submissionSignature: args.submissionSignature?.trim() || undefined,
      submissionStatement: args.submissionStatement?.trim() || undefined,
    });
    await ctx.scheduler.runAfter(0, internal.slack.sendReviewNotification, {
      checkInId,
    });
    return checkInId;
  },
});

export const generateProofUploadUrl = mutation({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, args) => {
    const { commitment } = await requireOwnedActiveCommitment(
      ctx,
      args.commitmentId,
    );
    if (commitment.goalType !== "workout") {
      throw new Error("Only workout pacts accept direct proof uploads");
    }
    return await ctx.storage.generateUploadUrl();
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
      args.commitmentId,
    );
    const checkIn = await ctx.db
      .query("checkIns")
      .withIndex("by_commitment_date", (q) =>
        q.eq("commitmentId", commitment._id).eq("date", args.date),
      )
      .unique();

    if (!checkIn || checkIn.userId !== user._id) return;
    if (checkIn.status !== "under_review") {
      throw new Error("Reviewed check-ins cannot be removed");
    }
    await ctx.db.delete(checkIn._id);
  },
});
