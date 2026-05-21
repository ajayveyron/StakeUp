import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { getRefundPerDay } from "./dates";
import {
  ensureWalletLedgerEntry,
  forfeitDestinationToLedger,
} from "./ledger";
import { charityName } from "./charities";
import {
  notifyCheckInApproved,
  notifyCheckInRejected,
} from "./notifications";

type Reviewer = {
  reviewerId?: Id<"users">;
  reviewerSource: "app" | "slack";
  reviewerLabel?: string;
};

export async function approveCheckInForReview(
  ctx: MutationCtx,
  args: { checkInId: Id<"checkIns">; reviewer: Reviewer },
) {
  const checkIn = await ctx.db.get(args.checkInId);
  if (!checkIn) throw new Error("Check-in not found");
  const commitment = await ctx.db.get(checkIn.commitmentId);
  if (!commitment) throw new Error("Commitment not found");

  const amount = getRefundPerDay(commitment);
  const now = new Date().toISOString();

  if (checkIn.status === "approved") {
    await ensureWalletLedgerEntry(ctx, {
      userId: checkIn.userId,
      commitmentId: checkIn.commitmentId,
      checkInId: checkIn._id,
      amount,
      currency: commitment.currency,
      type: "approved_refund",
      destination: "user",
    });
    return { ok: true };
  }

  if (checkIn.status !== "under_review") {
    throw new Error("Only pending check-ins can be approved");
  }

  await ctx.db.patch(checkIn._id, {
    status: "approved",
    verified: true,
    rejectionReason: undefined,
    reviewerId: args.reviewer.reviewerId,
    reviewedAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("reviewActions", {
    checkInId: checkIn._id,
    reviewerId: args.reviewer.reviewerId,
    reviewerSource: args.reviewer.reviewerSource,
    reviewerLabel: args.reviewer.reviewerLabel,
    action: "approve",
    createdAt: now,
  });

  await ensureWalletLedgerEntry(ctx, {
    userId: checkIn.userId,
    commitmentId: checkIn.commitmentId,
    checkInId: checkIn._id,
    amount,
    currency: commitment.currency,
    type: "approved_refund",
    destination: "user",
  });

  await notifyCheckInApproved(ctx, {
    user: await ctx.db.get(checkIn.userId),
    commitment,
    checkIn,
  });

  return { ok: true };
}

export async function rejectCheckInForReview(
  ctx: MutationCtx,
  args: {
    checkInId: Id<"checkIns">;
    reason: string;
    reviewer: Reviewer;
  },
) {
  const reason = args.reason.trim();
  if (!reason) throw new Error("Rejection reason is required");

  const checkIn = await ctx.db.get(args.checkInId);
  if (!checkIn) throw new Error("Check-in not found");
  const commitment = await ctx.db.get(checkIn.commitmentId);
  if (!commitment) throw new Error("Commitment not found");

  if (checkIn.status === "approved") {
    throw new Error("Approved check-ins cannot be rejected");
  }
  if (checkIn.status !== "under_review" && checkIn.status !== "rejected") {
    throw new Error("This check-in cannot be rejected");
  }

  const wasAlreadyRejected = checkIn.status === "rejected";
  const now = new Date().toISOString();
  await ctx.db.patch(checkIn._id, {
    status: "rejected",
    verified: false,
    rejectionReason: reason,
    reviewerId: args.reviewer.reviewerId,
    reviewedAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("reviewActions", {
    checkInId: checkIn._id,
    reviewerId: args.reviewer.reviewerId,
    reviewerSource: args.reviewer.reviewerSource,
    reviewerLabel: args.reviewer.reviewerLabel,
    action: "reject",
    reason,
    createdAt: now,
  });

  await ensureWalletLedgerEntry(ctx, {
    userId: checkIn.userId,
    commitmentId: checkIn.commitmentId,
    checkInId: checkIn._id,
    amount: getRefundPerDay(commitment),
    currency: commitment.currency,
    type: "forfeited",
    destination: forfeitDestinationToLedger(commitment.forfeitDestination),
    note: `Forfeited to ${charityName(commitment.forfeitDestination)}`,
  });

  if (!wasAlreadyRejected) {
    await notifyCheckInRejected(ctx, {
      user: await ctx.db.get(checkIn.userId),
      commitment,
      checkIn,
      reason,
    });
  }

  return { ok: true };
}
