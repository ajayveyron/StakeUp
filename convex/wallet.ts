import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { getRefundPerDay } from "./lib/dates";

type CurrencyTotals = {
  currency: string;
  depositsConfirmed: number;
  approvedRefundable: number;
  paidOut: number;
  pendingReview: number;
  forfeited: number;
  charityTransferred: number;
  payoutRequested: number;
};

function getTotals(
  map: Map<string, CurrencyTotals>,
  currency: string
): CurrencyTotals {
  const existing = map.get(currency);
  if (existing) return existing;
  const totals = {
    currency,
    depositsConfirmed: 0,
    approvedRefundable: 0,
    paidOut: 0,
    pendingReview: 0,
    forfeited: 0,
    charityTransferred: 0,
    payoutRequested: 0,
  };
  map.set(currency, totals);
  return totals;
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const totals = new Map<string, CurrencyTotals>();

    const entries = await ctx.db
      .query("walletLedgerEntries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const entry of entries) {
      const currencyTotals = getTotals(totals, entry.currency);
      if (entry.type === "approved_refund") {
        currencyTotals.approvedRefundable += entry.amount;
      } else if (entry.type === "manual_payout") {
        currencyTotals.paidOut += entry.amount;
      } else if (entry.type === "deposit_confirmed") {
        currencyTotals.depositsConfirmed += entry.amount;
      } else if (entry.type === "forfeited") {
        currencyTotals.forfeited += entry.amount;
      } else if (entry.type === "charity_transfer") {
        currencyTotals.charityTransferred += entry.amount;
      }
    }

    const payoutRequests = await ctx.db
      .query("manualPayoutRequests")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "pending")
      )
      .collect();

    for (const request of payoutRequests) {
      const currencyTotals = getTotals(totals, request.currency);
      currencyTotals.payoutRequested += request.amount;
    }

    const pendingCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "under_review")
      )
      .collect();

    for (const checkIn of pendingCheckIns) {
      const commitment = await ctx.db.get(checkIn.commitmentId);
      if (!commitment) continue;
      const currencyTotals = getTotals(totals, commitment.currency);
      currencyTotals.pendingReview += getRefundPerDay(commitment);
    }

    const byCurrency = [...totals.values()].map((currencyTotals) => ({
      ...currencyTotals,
      availableToPayout:
        Math.round(
          Math.max(
            0,
            currencyTotals.approvedRefundable -
              currencyTotals.paidOut -
              currencyTotals.payoutRequested
          ) * 100
        ) / 100,
      depositsConfirmed:
        Math.round(currencyTotals.depositsConfirmed * 100) / 100,
      approvedRefundable:
        Math.round(currencyTotals.approvedRefundable * 100) / 100,
      paidOut: Math.round(currencyTotals.paidOut * 100) / 100,
      pendingReview: Math.round(currencyTotals.pendingReview * 100) / 100,
      forfeited: Math.round(currencyTotals.forfeited * 100) / 100,
      charityTransferred:
        Math.round(currencyTotals.charityTransferred * 100) / 100,
      payoutRequested:
        Math.round(currencyTotals.payoutRequested * 100) / 100,
    }));

    const primary = byCurrency[0] ?? {
      currency: "INR",
      depositsConfirmed: 0,
      approvedRefundable: 0,
      availableToPayout: 0,
      paidOut: 0,
      pendingReview: 0,
      forfeited: 0,
      charityTransferred: 0,
      payoutRequested: 0,
    };

    return {
      ...primary,
      byCurrency,
    };
  },
});
