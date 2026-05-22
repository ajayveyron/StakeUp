import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Commitment } from "../../artifacts/mobile/contexts/CommitmentsContext";
import {
  getAmountAtRisk,
  getEndDateForDuration,
  getMissedDates,
  getPendingReviewCheckIns,
  getRefundPerDay,
  getScheduledDates,
  getSuccessRate,
  getTotalCommittedDays,
  getTotalRefunded,
  isActive,
} from "../../artifacts/mobile/utils/commitment";

function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: "commitment-1",
    name: "Publish reels",
    goalType: "content",
    daysOfWeek: [1, 3, 5],
    targetPerDay: 1,
    durationDays: 30,
    pactAmount: 3900,
    currency: "INR",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    checkIns: [],
    createdAt: "2026-05-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("commitment schedule helpers", () => {
  it("calculates inclusive end dates for preset durations", () => {
    assert.equal(getEndDateForDuration("2026-06-01", "week"), "2026-06-07");
    assert.equal(getEndDateForDuration("2026-06-01", "2weeks"), "2026-06-14");
    assert.equal(getEndDateForDuration("2026-06-01", "month"), "2026-06-30");
    assert.equal(getEndDateForDuration("2028-02-01", "month"), "2028-02-29");
    assert.equal(getEndDateForDuration("2026-01-01", "3months"), "2026-03-31");
  });

  it("returns only scheduled weekdays inside the commitment range", () => {
    const commitment = makeCommitment();

    assert.deepEqual(getScheduledDates(commitment), [
      "2026-06-01",
      "2026-06-03",
      "2026-06-05",
      "2026-06-08",
      "2026-06-10",
      "2026-06-12",
      "2026-06-15",
      "2026-06-17",
      "2026-06-19",
      "2026-06-22",
      "2026-06-24",
      "2026-06-26",
      "2026-06-29",
    ]);
    assert.equal(getTotalCommittedDays(commitment), 13);
  });
});

describe("commitment refund helpers", () => {
  it("splits the committed amount across scheduled days", () => {
    const commitment = makeCommitment();

    assert.equal(getRefundPerDay(commitment), 300);
  });

  it("counts only approved check-ins as refunded", () => {
    const commitment = makeCommitment({
      checkIns: [
        {
          id: "check-in-1",
          date: "2026-06-01",
          proofUrl: "https://example.com/post-1",
          status: "approved",
          verified: true,
          submittedAt: "2026-06-01T12:00:00.000Z",
        },
        {
          id: "check-in-2",
          date: "2026-06-03",
          proofUrl: "https://example.com/post-review",
          status: "under_review",
          verified: false,
          submittedAt: "2026-06-03T12:00:00.000Z",
        },
        {
          id: "check-in-3",
          date: "2026-06-05",
          proofUrl: "https://example.com/post-2",
          status: "approved",
          verified: true,
          submittedAt: "2026-06-05T12:00:00.000Z",
        },
        {
          id: "check-in-4",
          date: "2026-06-08",
          proofUrl: "https://example.com/private-post",
          status: "rejected",
          verified: false,
          rejectionReason: "Post was private during review.",
          reviewedAt: "2026-06-09T12:00:00.000Z",
          submittedAt: "2026-06-08T12:00:00.000Z",
        },
      ],
    });

    assert.equal(getPendingReviewCheckIns(commitment).length, 1);
    assert.equal(getTotalRefunded(commitment), 600);
    assert.equal(getAmountAtRisk(commitment), 3300);
  });

  it("does not treat draft pacts as active or at risk", () => {
    const commitment = makeCommitment({
      status: "draft",
      startDate: "2020-01-01",
      endDate: "2020-01-31",
    });

    assert.equal(isActive(commitment), false);
    assert.equal(getAmountAtRisk(commitment), 0);
    assert.deepEqual(getMissedDates(commitment), []);
    assert.equal(getSuccessRate(commitment), 0);
  });

  it("keeps explicit missed records after a pact stops inferring new misses", () => {
    const commitment = makeCommitment({
      status: "ended",
      startDate: "2020-01-01",
      endDate: "2020-01-31",
      checkIns: [
        {
          id: "check-in-missed",
          date: "2020-01-01",
          status: "missed",
          verified: false,
          submittedAt: "2020-01-02T00:00:00.000Z",
        },
      ],
    });

    assert.deepEqual(getMissedDates(commitment), ["2020-01-01"]);
  });
});
