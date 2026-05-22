import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateAdminMetrics } from "../../convex/lib/adminMetrics";

const baseRange = {
  today: "2026-05-22",
  last30SinceDate: "2026-04-23",
  last30SinceIso: "2026-04-23T00:00:00.000Z",
};

describe("admin metrics", () => {
  it("returns empty-safe metrics when denominators are zero", () => {
    const metrics = calculateAdminMetrics({
      ...baseRange,
      users: [],
      commitments: [],
      checkIns: [],
      ledgerEntries: [],
      payoutRequests: [],
    });

    assert.equal(metrics.allTime.usersCreatingPact.value, null);
    assert.equal(metrics.allTime.averageDepositAmount.amount, 0);
    assert.equal(metrics.allTime.medianReviewMinutes, null);
    assert.equal(metrics.last30Days.proofSubmissionRate.value, null);
  });

  it("calculates all-time founder metrics", () => {
    const metrics = calculateAdminMetrics({
      ...baseRange,
      users: [
        { id: "u1", role: "user", createdAt: "2026-05-01T00:00:00.000Z" },
        { id: "u2", role: "user", createdAt: "2026-05-02T00:00:00.000Z" },
        { id: "admin", role: "admin", createdAt: "2026-05-01T00:00:00.000Z" },
      ],
      commitments: [
        {
          id: "c1",
          userId: "u1",
          daysOfWeek: [1, 2, 3, 4, 5],
          startDate: "2026-05-18",
          endDate: "2026-05-22",
          status: "active",
          pactAmount: 3000,
          currency: "INR",
          createdAt: "2026-05-01T00:00:00.000Z",
          paymentConfirmedAt: "2026-05-01T02:00:00.000Z",
        },
        {
          id: "c2",
          userId: "u1",
          daysOfWeek: [1],
          startDate: "2026-06-01",
          endDate: "2026-06-30",
          status: "ended",
          pactAmount: 1000,
          currency: "INR",
          createdAt: "2026-05-03T00:00:00.000Z",
          paymentConfirmedAt: "2026-05-03T02:00:00.000Z",
          earlyEndSettlementStatus: "pending",
        },
        {
          id: "c3",
          userId: "u2",
          daysOfWeek: [2],
          startDate: "2026-06-01",
          endDate: "2026-06-30",
          status: "draft",
          pactAmount: 2000,
          currency: "INR",
          createdAt: "2026-05-04T00:00:00.000Z",
        },
        {
          id: "c4",
          userId: "u2",
          daysOfWeek: [3, 4],
          startDate: "2026-04-01",
          endDate: "2026-04-02",
          status: "active",
          pactAmount: 2000,
          currency: "INR",
          createdAt: "2026-04-01T00:00:00.000Z",
          paymentConfirmedAt: "2026-04-01T02:00:00.000Z",
        },
      ],
      checkIns: [
        {
          id: "ci1",
          commitmentId: "c1",
          date: "2026-05-18",
          status: "approved",
          submittedAt: "2026-05-18T09:00:00.000Z",
          reviewedAt: "2026-05-18T10:00:00.000Z",
          createdAt: "2026-05-18T09:00:00.000Z",
        },
        {
          id: "ci2",
          commitmentId: "c1",
          date: "2026-05-19",
          status: "rejected",
          submittedAt: "2026-05-19T09:00:00.000Z",
          reviewedAt: "2026-05-19T11:00:00.000Z",
          createdAt: "2026-05-19T09:00:00.000Z",
        },
        {
          id: "ci3",
          commitmentId: "c1",
          date: "2026-05-20",
          status: "under_review",
          submittedAt: "2026-05-20T09:00:00.000Z",
          createdAt: "2026-05-20T09:00:00.000Z",
        },
        {
          id: "ci4",
          commitmentId: "c1",
          date: "2026-05-21",
          status: "missed",
          createdAt: "2026-05-21T23:00:00.000Z",
        },
        {
          id: "ci5",
          commitmentId: "c4",
          date: "2026-04-01",
          status: "approved",
          submittedAt: "2026-04-01T09:00:00.000Z",
          reviewedAt: "2026-04-01T09:30:00.000Z",
          createdAt: "2026-04-01T09:00:00.000Z",
        },
        {
          id: "ci6",
          commitmentId: "c4",
          date: "2026-04-02",
          status: "approved",
          submittedAt: "2026-04-02T09:00:00.000Z",
          reviewedAt: "2026-04-02T10:30:00.000Z",
          createdAt: "2026-04-02T09:00:00.000Z",
        },
      ],
      ledgerEntries: [
        {
          userId: "u1",
          commitmentId: "c1",
          amount: 3000,
          currency: "INR",
          type: "deposit_confirmed",
          destination: "razorpay",
          createdAt: "2026-05-01T02:00:00.000Z",
        },
        {
          userId: "u1",
          commitmentId: "c2",
          amount: 1000,
          currency: "INR",
          type: "deposit_confirmed",
          destination: "razorpay",
          createdAt: "2026-05-03T02:00:00.000Z",
        },
        {
          userId: "u2",
          commitmentId: "c4",
          amount: 2000,
          currency: "INR",
          type: "deposit_confirmed",
          destination: "razorpay",
          createdAt: "2026-04-01T02:00:00.000Z",
        },
        {
          userId: "u1",
          commitmentId: "c1",
          amount: 600,
          currency: "INR",
          type: "approved_refund",
          destination: "user",
          createdAt: "2026-05-18T10:00:00.000Z",
        },
        {
          userId: "u2",
          commitmentId: "c4",
          amount: 200,
          currency: "INR",
          type: "approved_refund",
          destination: "user",
          createdAt: "2026-04-01T09:30:00.000Z",
        },
        {
          userId: "u1",
          commitmentId: "c1",
          amount: 100,
          currency: "INR",
          type: "forfeited",
          destination: "charity",
          createdAt: "2026-05-19T11:00:00.000Z",
        },
        {
          userId: "u1",
          amount: 300,
          currency: "INR",
          type: "manual_payout",
          destination: "user",
          createdAt: "2026-05-20T10:00:00.000Z",
        },
      ],
      payoutRequests: [
        {
          userId: "u1",
          amount: 200,
          currency: "INR",
          status: "pending",
          createdAt: "2026-05-21T10:00:00.000Z",
        },
      ],
    });

    assert.equal(metrics.allTime.usersCreatingPact.value, 1);
    assert.equal(metrics.allTime.draftToDepositPaid.numerator, 3);
    assert.equal(metrics.allTime.draftToDepositPaid.denominator, 4);
    assert.equal(metrics.allTime.averageDepositAmount.amount, 2000);
    assert.equal(metrics.allTime.proofSubmissionRate.numerator, 5);
    assert.equal(metrics.allTime.proofSubmissionRate.denominator, 7);
    assert.equal(metrics.allTime.proofApprovalRate.numerator, 3);
    assert.equal(metrics.allTime.proofApprovalRate.denominator, 5);
    assert.equal(metrics.allTime.pactCompletionRate.value, 1);
    assert.equal(metrics.allTime.earlyQuitRate.numerator, 1);
    assert.equal(metrics.allTime.earlyQuitRate.denominator, 3);
    assert.equal(metrics.allTime.repeatPactRate.value, 1);
    assert.equal(metrics.allTime.refundRequestRate.numerator, 1);
    assert.equal(metrics.allTime.refundRequestRate.denominator, 2);
    assert.equal(metrics.allTime.depositLiabilityLocked.amount, 5100);
    assert.equal(metrics.allTime.forfeitedToCharity.amount, 100);
    assert.equal(metrics.allTime.pendingPayoutAmount.amount, 500);
    assert.equal(metrics.allTime.medianReviewMinutes, 75);
  });

  it("filters event-based metrics to the last 30 days", () => {
    const metrics = calculateAdminMetrics({
      ...baseRange,
      users: [
        { id: "u1", role: "user", createdAt: "2026-05-01T00:00:00.000Z" },
        { id: "u2", role: "user", createdAt: "2026-05-02T00:00:00.000Z" },
      ],
      commitments: [
        {
          id: "recent-paid",
          userId: "u1",
          daysOfWeek: [1],
          startDate: "2026-05-18",
          endDate: "2026-05-18",
          status: "active",
          pactAmount: 1000,
          currency: "INR",
          createdAt: "2026-05-01T00:00:00.000Z",
          paymentConfirmedAt: "2026-05-01T01:00:00.000Z",
        },
        {
          id: "old-paid",
          userId: "u2",
          daysOfWeek: [1],
          startDate: "2026-04-06",
          endDate: "2026-04-06",
          status: "active",
          pactAmount: 2000,
          currency: "INR",
          createdAt: "2026-04-01T00:00:00.000Z",
          paymentConfirmedAt: "2026-04-01T01:00:00.000Z",
        },
      ],
      checkIns: [
        {
          id: "recent-proof",
          commitmentId: "recent-paid",
          date: "2026-05-18",
          status: "approved",
          submittedAt: "2026-05-18T09:00:00.000Z",
          reviewedAt: "2026-05-18T10:00:00.000Z",
          createdAt: "2026-05-18T09:00:00.000Z",
        },
        {
          id: "old-proof",
          commitmentId: "old-paid",
          date: "2026-04-06",
          status: "approved",
          submittedAt: "2026-04-06T09:00:00.000Z",
          reviewedAt: "2026-04-06T10:00:00.000Z",
          createdAt: "2026-04-06T09:00:00.000Z",
        },
      ],
      ledgerEntries: [
        {
          userId: "u1",
          commitmentId: "recent-paid",
          amount: 1000,
          currency: "INR",
          type: "deposit_confirmed",
          destination: "razorpay",
          createdAt: "2026-05-01T01:00:00.000Z",
        },
        {
          userId: "u2",
          commitmentId: "old-paid",
          amount: 2000,
          currency: "INR",
          type: "deposit_confirmed",
          destination: "razorpay",
          createdAt: "2026-04-01T01:00:00.000Z",
        },
      ],
      payoutRequests: [],
    });

    assert.equal(metrics.allTime.averageDepositAmount.amount, 1500);
    assert.equal(metrics.last30Days.averageDepositAmount.amount, 1000);
    assert.equal(metrics.last30Days.usersCreatingPact.numerator, 1);
    assert.equal(metrics.last30Days.usersCreatingPact.denominator, 2);
    assert.equal(metrics.last30Days.proofSubmissionRate.value, 1);
  });
});
