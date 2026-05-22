import type { GenericDatabaseReader } from "convex/server";

import type { DataModel, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const FIRST_PACT_PASS_REFERENCE = "first_pact_pass_covered:v1";

type SlotLedgerEntry = {
  type: "slot_purchased" | "slot_consumed" | "slot_adjustment";
  quantity: number;
  externalReference?: string;
};

type SlotReadCtx = {
  db: GenericDatabaseReader<DataModel>;
};

type ConsumeSlotArgs = {
  userId: Id<"users">;
  commitmentId: Id<"commitments">;
  externalReference?: string;
  createdBy?: Id<"users">;
  note?: string;
  coveredNote?: string;
};

async function slotLedgerEntries(ctx: SlotReadCtx, userId: Id<"users">) {
  return await ctx.db
    .query("pactSlotLedgerEntries")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

export function summarizePactPassEntries(entries: readonly SlotLedgerEntry[]) {
  const purchased = entries
    .filter((entry) => entry.type === "slot_purchased")
    .reduce((sum, entry) => sum + entry.quantity, 0);
  const consumed = Math.abs(
    entries
      .filter((entry) => entry.type === "slot_consumed")
      .reduce((sum, entry) => sum + entry.quantity, 0),
  );
  const adjusted = entries
    .filter((entry) => entry.type === "slot_adjustment")
    .reduce((sum, entry) => sum + entry.quantity, 0);
  const regularConsumed = Math.abs(
    entries
      .filter(
        (entry) =>
          entry.type === "slot_consumed" &&
          entry.externalReference !== FIRST_PACT_PASS_REFERENCE,
      )
      .reduce((sum, entry) => sum + entry.quantity, 0),
  );
  const firstPactPassCovered = entries.some(
    (entry) =>
      entry.type === "slot_adjustment" &&
      entry.externalReference === FIRST_PACT_PASS_REFERENCE &&
      entry.quantity > 0,
  );
  const firstPactPassConsumed = entries.some(
    (entry) =>
      entry.type === "slot_consumed" &&
      entry.externalReference === FIRST_PACT_PASS_REFERENCE,
  );
  const available = Math.max(0, purchased - consumed + adjusted);

  return {
    purchased,
    consumed,
    adjusted,
    available,
    paidPassesAvailable: Math.max(0, purchased - regularConsumed),
    firstPactPassCovered,
    firstPactPassConsumed,
    firstPactPassAvailable:
      firstPactPassCovered && !firstPactPassConsumed && available > 0,
    firstPactPassReference: FIRST_PACT_PASS_REFERENCE,
  };
}

export async function pactPassSummary(
  ctx: SlotReadCtx,
  userId: Id<"users">,
) {
  return summarizePactPassEntries(await slotLedgerEntries(ctx, userId));
}

export async function slotBalance(ctx: SlotReadCtx, userId: Id<"users">) {
  return (await pactPassSummary(ctx, userId)).available;
}

export async function ensureFirstPactPassCovered(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const summary = await pactPassSummary(ctx, userId);
  if (summary.firstPactPassCovered) return { granted: false };

  const now = new Date().toISOString();
  await ctx.db.insert("pactSlotLedgerEntries", {
    userId,
    type: "slot_adjustment",
    quantity: 1,
    amount: 0,
    currency: "INR",
    externalReference: FIRST_PACT_PASS_REFERENCE,
    note: "First Pact Pass covered. Refundable deposit still required.",
    createdAt: now,
  });

  return { granted: true };
}

export async function consumeSlotForCommitment(
  ctx: MutationCtx,
  args: ConsumeSlotArgs,
) {
  const existing = await ctx.db
    .query("pactSlotLedgerEntries")
    .withIndex("by_commitment", (q) => q.eq("commitmentId", args.commitmentId))
    .filter((q) => q.eq(q.field("type"), "slot_consumed"))
    .first();
  if (existing) return existing._id;

  const summary = await pactPassSummary(ctx, args.userId);
  if (summary.available < 1) throw new Error("Buy a Pact Pass before starting");

  const consumesCoveredPass = summary.firstPactPassAvailable;

  return await ctx.db.insert("pactSlotLedgerEntries", {
    userId: args.userId,
    commitmentId: args.commitmentId,
    type: "slot_consumed",
    quantity: -1,
    externalReference: consumesCoveredPass
      ? FIRST_PACT_PASS_REFERENCE
      : args.externalReference,
    note: consumesCoveredPass
      ? (args.coveredNote ??
        "Covered first Pact Pass consumed when this pact started.")
      : (args.note ?? "Pact Pass consumed when this pact started."),
    createdBy: args.createdBy,
    createdAt: new Date().toISOString(),
  });
}
