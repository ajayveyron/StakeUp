import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export function forfeitDestinationToLedger(
  destination: "friend" | "reward_pool",
): "friend" | "reward_pool" {
  return destination === "friend" ? "friend" : "reward_pool";
}

export async function ensureWalletLedgerEntry(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    commitmentId: Id<"commitments">;
    checkInId: Id<"checkIns">;
    amount: number;
    currency: string;
    type: "approved_refund" | "forfeited";
    destination: "user" | "friend" | "reward_pool";
  },
) {
  const existing = await ctx.db
    .query("walletLedgerEntries")
    .withIndex("by_check_in", (q) => q.eq("checkInId", args.checkInId))
    .filter((q) => q.eq(q.field("type"), args.type))
    .first();

  if (existing) return existing._id;

  return await ctx.db.insert("walletLedgerEntries", {
    userId: args.userId,
    commitmentId: args.commitmentId,
    checkInId: args.checkInId,
    amount: args.amount,
    currency: args.currency,
    type: args.type,
    destination: args.destination,
    createdAt: new Date().toISOString(),
  });
}

export async function ensureDepositLedgerEntry(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    commitmentId: Id<"commitments">;
    amount: number;
    currency: string;
    externalReference?: string;
    note?: string;
    createdBy?: Id<"users">;
  },
) {
  const existing = await ctx.db
    .query("walletLedgerEntries")
    .withIndex("by_commitment", (q) => q.eq("commitmentId", args.commitmentId))
    .filter((q) => q.eq(q.field("type"), "deposit_confirmed"))
    .first();

  if (existing) return existing._id;

  return await ctx.db.insert("walletLedgerEntries", {
    userId: args.userId,
    commitmentId: args.commitmentId,
    amount: args.amount,
    currency: args.currency,
    type: "deposit_confirmed",
    destination: "admin_upi",
    externalReference: args.externalReference,
    note: args.note,
    createdBy: args.createdBy,
    createdAt: new Date().toISOString(),
  });
}

export async function insertManualPayoutLedgerEntry(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    commitmentId?: Id<"commitments">;
    checkInId?: Id<"checkIns">;
    amount: number;
    currency: string;
    externalReference?: string;
    note?: string;
    createdBy?: Id<"users">;
  },
) {
  return await ctx.db.insert("walletLedgerEntries", {
    userId: args.userId,
    commitmentId: args.commitmentId,
    checkInId: args.checkInId,
    amount: args.amount,
    currency: args.currency,
    type: "manual_payout",
    destination: "user",
    externalReference: args.externalReference,
    note: args.note,
    createdBy: args.createdBy,
    createdAt: new Date().toISOString(),
  });
}

export async function ensureManualPayoutLedgerEntry(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    commitmentId?: Id<"commitments">;
    checkInId: Id<"checkIns">;
    amount: number;
    currency: string;
    externalReference?: string;
    note?: string;
    createdBy?: Id<"users">;
  },
) {
  const existing = await ctx.db
    .query("walletLedgerEntries")
    .withIndex("by_check_in", (q) => q.eq("checkInId", args.checkInId))
    .filter((q) => q.eq(q.field("type"), "manual_payout"))
    .first();

  if (existing) return existing._id;

  return await insertManualPayoutLedgerEntry(ctx, args);
}
