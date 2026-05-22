type UserRow = {
  id: string;
  role: "user" | "admin";
  createdAt: string;
};

type CommitmentRow = {
  id: string;
  userId: string;
  daysOfWeek: number[];
  startDate: string;
  endDate: string;
  status: "draft" | "pending_payment" | "pending_deposit" | "active" | "ended" | "deleted";
  pactAmount: number;
  currency: string;
  createdAt: string;
  paymentConfirmedAt?: string;
  earlyEndSettlementStatus?: "pending" | "resolved" | "cancelled";
  earlyEndReason?: string;
};

type CheckInRow = {
  id: string;
  commitmentId: string;
  date: string;
  status: "under_review" | "approved" | "rejected" | "missed";
  submittedAt?: string;
  reviewedAt?: string;
  createdAt: string;
};

type LedgerRow = {
  userId: string;
  commitmentId?: string;
  amount: number;
  currency: string;
  type:
    | "deposit_confirmed"
    | "approved_refund"
    | "forfeited"
    | "manual_payout"
    | "charity_transfer";
  destination: "user" | "charity" | "razorpay";
  createdAt: string;
};

type PayoutRequestRow = {
  userId: string;
  amount: number;
  currency: string;
  status: "pending" | "processed" | "cancelled";
  createdAt: string;
};

type MetricRange = {
  sinceDate?: string;
  sinceIso?: string;
  today: string;
};

export type RateMetric = {
  value: number | null;
  numerator: number;
  denominator: number;
};

export type AmountMetric = {
  amount: number;
  currency: string;
};

export type AdminMetricSummary = {
  usersCreatingPact: RateMetric;
  draftToDepositPaid: RateMetric;
  averageDepositAmount: AmountMetric & { count: number };
  activePacts: number;
  proofSubmissionRate: RateMetric;
  proofApprovalRate: RateMetric;
  pactCompletionRate: RateMetric;
  earlyQuitRate: RateMetric;
  repeatPactRate: RateMetric;
  refundRequestRate: RateMetric;
  depositLiabilityLocked: AmountMetric;
  forfeitedToCharity: AmountMetric;
  pendingPayoutAmount: AmountMetric;
  medianReviewMinutes: number | null;
};

export type AdminMetricsInput = {
  users: UserRow[];
  commitments: CommitmentRow[];
  checkIns: CheckInRow[];
  ledgerEntries: LedgerRow[];
  payoutRequests: PayoutRequestRow[];
  today: string;
  last30SinceDate: string;
  last30SinceIso: string;
};

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

function rate(numerator: number, denominator: number): RateMetric {
  return {
    value: denominator === 0 ? null : numerator / denominator,
    numerator,
    denominator,
  };
}

function isIsoInRange(value: string | undefined, sinceIso?: string) {
  if (!sinceIso) return true;
  return Boolean(value && value >= sinceIso);
}

function isDateInRange(value: string | undefined, sinceDate?: string) {
  if (!sinceDate) return true;
  return Boolean(value && value >= sinceDate);
}

function addOneDay(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

function dayOfWeek(date: string) {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function scheduledDatesElapsed(commitment: CommitmentRow, range: MetricRange) {
  const dates: string[] = [];
  const endDate = commitment.endDate < range.today ? commitment.endDate : range.today;
  let cursor = commitment.startDate;

  while (cursor <= endDate) {
    if (
      isDateInRange(cursor, range.sinceDate) &&
      commitment.daysOfWeek.includes(dayOfWeek(cursor))
    ) {
      dates.push(cursor);
    }
    cursor = addOneDay(cursor);
  }

  return dates;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function isEarlyQuit(commitment: CommitmentRow) {
  return (
    commitment.earlyEndSettlementStatus === "pending" ||
    commitment.earlyEndSettlementStatus === "resolved" ||
    Boolean(commitment.earlyEndReason)
  );
}

function calculateRangeMetrics(input: AdminMetricsInput, range: MetricRange) {
  const currency = "INR";
  const users = input.users.filter(
    (user) => user.role !== "admin" && isIsoInRange(user.createdAt, range.sinceIso),
  );
  const userIds = new Set(users.map((user) => user.id));
  const commitments = input.commitments.filter(
    (commitment) =>
      commitment.status !== "deleted" &&
      userIds.has(commitment.userId) &&
      isIsoInRange(commitment.createdAt, range.sinceIso),
  );
  const commitmentIds = new Set(commitments.map((commitment) => commitment.id));
  const depositLedger = input.ledgerEntries.filter(
    (entry) =>
      entry.type === "deposit_confirmed" && isIsoInRange(entry.createdAt, range.sinceIso),
  );
  const depositConfirmedIds = new Set(
    input.ledgerEntries
      .filter((entry) => entry.type === "deposit_confirmed" && entry.commitmentId)
      .map((entry) => entry.commitmentId),
  );
  const depositConfirmedCommitments = commitments.filter(
    (commitment) =>
      Boolean(commitment.paymentConfirmedAt) || depositConfirmedIds.has(commitment.id),
  );
  const activePacts = commitments.filter((commitment) => commitment.status === "active").length;
  const usersWithPact = new Set(commitments.map((commitment) => commitment.userId));
  const pactCountsByUser = new Map<string, number>();

  for (const commitment of commitments) {
    pactCountsByUser.set(
      commitment.userId,
      (pactCountsByUser.get(commitment.userId) ?? 0) + 1,
    );
  }

  const checkInsByCommitment = new Map<string, CheckInRow[]>();
  for (const checkIn of input.checkIns) {
    if (!commitmentIds.has(checkIn.commitmentId)) continue;
    if (!isDateInRange(checkIn.date, range.sinceDate)) continue;
    const rows = checkInsByCommitment.get(checkIn.commitmentId) ?? [];
    rows.push(checkIn);
    checkInsByCommitment.set(checkIn.commitmentId, rows);
  }

  let scheduledOpportunities = 0;
  let submittedProofs = 0;
  let approvedProofs = 0;
  const reviewedMinutes: number[] = [];

  for (const commitment of depositConfirmedCommitments) {
    scheduledOpportunities += scheduledDatesElapsed(commitment, range).length;
    for (const checkIn of checkInsByCommitment.get(commitment.id) ?? []) {
      if (checkIn.status !== "missed") submittedProofs += 1;
      if (checkIn.status === "approved") approvedProofs += 1;
      if (checkIn.submittedAt && checkIn.reviewedAt) {
        const minutes =
          (new Date(checkIn.reviewedAt).getTime() -
            new Date(checkIn.submittedAt).getTime()) /
          60000;
        if (Number.isFinite(minutes) && minutes >= 0) reviewedMinutes.push(minutes);
      }
    }
  }

  const completedEligible = depositConfirmedCommitments.filter(
    (commitment) => commitment.endDate < input.today && isDateInRange(commitment.endDate, range.sinceDate),
  );
  const completedPacts = completedEligible.filter((commitment) => !isEarlyQuit(commitment));
  const earlyQuitPacts = depositConfirmedCommitments.filter(
    (commitment) => isEarlyQuit(commitment) && isIsoInRange(commitment.createdAt, range.sinceIso),
  );
  const usersWithRepeatPact = [...pactCountsByUser.values()].filter((count) => count >= 2).length;
  const usersWithApprovedRefund = new Set(
    input.ledgerEntries
      .filter(
        (entry) =>
          entry.type === "approved_refund" &&
          entry.destination === "user" &&
          isIsoInRange(entry.createdAt, range.sinceIso),
      )
      .map((entry) => entry.userId),
  );
  const usersWithRefundRequest = new Set(
    input.payoutRequests
      .filter((request) => isIsoInRange(request.createdAt, range.sinceIso))
      .map((request) => request.userId),
  );
  const entriesInRange = input.ledgerEntries.filter((entry) =>
    isIsoInRange(entry.createdAt, range.sinceIso),
  );
  const depositsConfirmed = entriesInRange.reduce(
    (sum, entry) => sum + (entry.type === "deposit_confirmed" ? entry.amount : 0),
    0,
  );
  const refundResolved = entriesInRange.reduce(
    (sum, entry) => sum + (entry.type === "approved_refund" ? entry.amount : 0),
    0,
  );
  const forfeited = entriesInRange.reduce(
    (sum, entry) => sum + (entry.type === "forfeited" ? entry.amount : 0),
    0,
  );
  const pendingRequests = input.payoutRequests
    .filter(
      (request) =>
        request.status === "pending" && isIsoInRange(request.createdAt, range.sinceIso),
    )
    .reduce((sum, request) => sum + request.amount, 0);
  const paidOut = entriesInRange.reduce(
    (sum, entry) => sum + (entry.type === "manual_payout" ? entry.amount : 0),
    0,
  );
  const pendingRefundCredit = Math.max(0, refundResolved - paidOut - pendingRequests);
  const totalDepositAmount = depositLedger.reduce((sum, entry) => sum + entry.amount, 0);

  return {
    usersCreatingPact: rate(usersWithPact.size, users.length),
    draftToDepositPaid: rate(depositConfirmedCommitments.length, commitments.length),
    averageDepositAmount: {
      amount: depositLedger.length === 0 ? 0 : roundMoney(totalDepositAmount / depositLedger.length),
      count: depositLedger.length,
      currency,
    },
    activePacts,
    proofSubmissionRate: rate(submittedProofs, scheduledOpportunities),
    proofApprovalRate: rate(approvedProofs, submittedProofs),
    pactCompletionRate: rate(completedPacts.length, completedEligible.length),
    earlyQuitRate: rate(earlyQuitPacts.length, depositConfirmedCommitments.length),
    repeatPactRate: rate(usersWithRepeatPact, usersWithPact.size),
    refundRequestRate: rate(usersWithRefundRequest.size, usersWithApprovedRefund.size),
    depositLiabilityLocked: {
      amount: roundMoney(Math.max(0, depositsConfirmed - refundResolved - forfeited)),
      currency,
    },
    forfeitedToCharity: {
      amount: roundMoney(forfeited),
      currency,
    },
    pendingPayoutAmount: {
      amount: roundMoney(pendingRequests + pendingRefundCredit),
      currency,
    },
    medianReviewMinutes: median(reviewedMinutes),
  } satisfies AdminMetricSummary;
}

export function calculateAdminMetrics(input: AdminMetricsInput) {
  return {
    allTime: calculateRangeMetrics(input, { today: input.today }),
    last30Days: calculateRangeMetrics(input, {
      sinceDate: input.last30SinceDate,
      sinceIso: input.last30SinceIso,
      today: input.today,
    }),
  };
}
