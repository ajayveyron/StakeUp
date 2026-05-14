import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { getRefundPerDay, getScheduledDates, todayInTimeZone } from "./lib/dates";
import {
  ensureWalletLedgerEntry,
  forfeitDestinationToLedger,
} from "./lib/ledger";

export const markMissedCheckIns = internalMutation({
  args: {},
  handler: async (ctx) => {
    const activeCommitments = await ctx.db
      .query("commitments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(200);

    let created = 0;
    let ledgerEntriesEnsured = 0;

    for (const commitment of activeCommitments) {
      const today = todayInTimeZone(commitment.timezone);
      const overdueDates = getScheduledDates(commitment).filter(
        (date) => date < today
      );

      for (const date of overdueDates) {
        const existing = await ctx.db
          .query("checkIns")
          .withIndex("by_commitment_date", (q) =>
            q.eq("commitmentId", commitment._id).eq("date", date)
          )
          .unique();

        if (
          existing?.status === "under_review" ||
          existing?.status === "approved"
        ) {
          continue;
        }

        const now = new Date().toISOString();
        const checkInId =
          existing?._id ??
          (await ctx.db.insert("checkIns", {
            userId: commitment.userId,
            commitmentId: commitment._id,
            date,
            status: "missed",
            verified: false,
            createdAt: now,
            updatedAt: now,
          }));

        if (!existing) created += 1;

        await ensureWalletLedgerEntry(ctx, {
          userId: commitment.userId,
          commitmentId: commitment._id,
          checkInId,
          amount: getRefundPerDay(commitment),
          currency: commitment.currency,
          type: "forfeited",
          destination: forfeitDestinationToLedger(commitment.forfeitDestination),
        });
        ledgerEntriesEnsured += 1;
      }
    }

    return { created, ledgerEntriesEnsured };
  },
});

const crons = cronJobs();

crons.interval("mark missed check-ins", { hours: 1 }, internal.crons.markMissedCheckIns);

export default crons;
