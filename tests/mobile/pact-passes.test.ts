import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Id } from "../../convex/_generated/dataModel";
import {
  consumeSlotForCommitment,
  ensureFirstPactPassCovered,
  FIRST_PACT_PASS_REFERENCE,
  summarizePactPassEntries,
} from "../../convex/lib/pactPasses";

type FakeEntry = {
  _id?: string;
  userId: string;
  commitmentId?: string;
  type: "slot_purchased" | "slot_consumed" | "slot_adjustment";
  quantity: number;
  amount?: number;
  currency?: string;
  externalReference?: string;
  note?: string;
  createdAt?: string;
};

function fakeCtx(entries: FakeEntry[]) {
  return {
    db: {
      query(table: string) {
        assert.equal(table, "pactSlotLedgerEntries");
        return {
          withIndex(_index: string, build: (q: any) => unknown) {
            const constraints: { field: keyof FakeEntry; value: string }[] = [];
            const q = {
              eq(field: keyof FakeEntry, value: string) {
                constraints.push({ field, value });
                return q;
              },
            };
            build(q);
            const matches = (entry: FakeEntry) =>
              constraints.every(({ field, value }) => entry[field] === value);
            return {
              collect: async () => entries.filter(matches),
              filter: () => ({
                first: async () =>
                  entries.find(
                    (entry) => matches(entry) && entry.type === "slot_consumed",
                  ) ?? null,
              }),
            };
          },
        };
      },
      insert: async (table: string, value: FakeEntry) => {
        assert.equal(table, "pactSlotLedgerEntries");
        const entry = { ...value, _id: `entry-${entries.length + 1}` };
        entries.push(entry);
        return entry._id;
      },
    },
  } as any;
}

describe("Pact Pass ledger helpers", () => {
  it("grants the covered first Pact Pass once per user", async () => {
    const entries: FakeEntry[] = [];
    const ctx = fakeCtx(entries);
    const userId = "user-1" as Id<"users">;

    assert.deepEqual(await ensureFirstPactPassCovered(ctx, userId), {
      granted: true,
    });
    assert.deepEqual(await ensureFirstPactPassCovered(ctx, userId), {
      granted: false,
    });

    assert.equal(entries.length, 1);
    assert.equal(entries[0].type, "slot_adjustment");
    assert.equal(entries[0].quantity, 1);
    assert.equal(entries[0].amount, 0);
    assert.equal(entries[0].externalReference, FIRST_PACT_PASS_REFERENCE);
  });

  it("consumes the covered pass before preserving a paid pass", async () => {
    const userId = "user-1" as Id<"users">;
    const entries: FakeEntry[] = [
      {
        userId,
        type: "slot_purchased",
        quantity: 1,
        amount: 249,
        currency: "INR",
        externalReference: "pay_paid_pass",
      },
      {
        userId,
        type: "slot_adjustment",
        quantity: 1,
        amount: 0,
        currency: "INR",
        externalReference: FIRST_PACT_PASS_REFERENCE,
      },
    ];
    const ctx = fakeCtx(entries);

    await consumeSlotForCommitment(ctx, {
      userId,
      commitmentId: "commitment-1" as Id<"commitments">,
      externalReference: "deposit_1",
    });

    let summary = summarizePactPassEntries(entries);
    assert.equal(summary.firstPactPassConsumed, true);
    assert.equal(summary.available, 1);
    assert.equal(summary.paidPassesAvailable, 1);
    assert.equal(
      entries.find((entry) => entry.commitmentId === "commitment-1")
        ?.externalReference,
      FIRST_PACT_PASS_REFERENCE,
    );

    await consumeSlotForCommitment(ctx, {
      userId,
      commitmentId: "commitment-2" as Id<"commitments">,
      externalReference: "deposit_2",
    });

    summary = summarizePactPassEntries(entries);
    assert.equal(summary.available, 0);
    assert.equal(
      entries.find((entry) => entry.commitmentId === "commitment-2")
        ?.externalReference,
      "deposit_2",
    );
  });
});
