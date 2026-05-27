import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const goalType = v.union(v.literal("content"), v.literal("workout"));
const checkInStatus = v.union(
  v.literal("under_review"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("missed"),
);
const forfeitDestination = v.union(
  v.literal("akshaya_patra"),
  v.literal("goonj"),
  v.literal("cry"),
  v.literal("helpage_india"),
  v.literal("wildlife_sos"),
);
const commitmentStatus = v.union(
  v.literal("draft"),
  v.literal("pending_payment"),
  v.literal("pending_deposit"),
  v.literal("active"),
  v.literal("ended"),
  v.literal("deleted"),
);
const pactSlotPurchaseStatus = v.union(
  v.literal("pending_payment"),
  v.literal("paid"),
  v.literal("cancelled"),
);
const pactSlotLedgerType = v.union(
  v.literal("slot_purchased"),
  v.literal("slot_consumed"),
  v.literal("slot_adjustment"),
);
const earlyEndSettlementStatus = v.union(
  v.literal("pending"),
  v.literal("resolved"),
  v.literal("cancelled"),
);
const manualPayoutRequestStatus = v.union(
  v.literal("pending"),
  v.literal("processed"),
  v.literal("cancelled"),
);
const paymentPurpose = v.union(
  v.literal("legacy_checkout"),
  v.literal("slot_fee"),
  v.literal("pact_deposit"),
);
const paymentOrderStatus = v.union(
  v.literal("created"),
  v.literal("paid"),
  v.literal("failed"),
);
const refundWithdrawalStatus = v.union(
  v.literal("processing"),
  v.literal("processed"),
  v.literal("failed"),
);
const userRole = v.union(v.literal("user"), v.literal("admin"));
const notificationType = v.union(
  v.literal("payment_pending"),
  v.literal("payment_confirmed"),
  v.literal("payment_discarded"),
  v.literal("slot_confirmed"),
  v.literal("manual_payout_requested"),
  v.literal("check_in_approved"),
  v.literal("check_in_rejected"),
  v.literal("manual_payout_recorded"),
);
const notificationDeliveryStatus = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("skipped"),
  v.literal("failed"),
);
const betaCommitmentCategory = v.union(
  v.literal("fasting"),
  v.literal("exercise"),
  v.literal("content"),
  v.literal("custom"),
);
const betaCommitmentStatus = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("deleted"),
);
const betaSubmissionStatus = v.union(
  v.literal("submitted"),
  v.literal("approved"),
  v.literal("missed"),
  v.literal("skipped"),
);
const betaLedgerEntryType = v.union(
  v.literal("payment_received"),
  v.literal("refund_earned"),
  v.literal("refund_paid"),
  v.literal("forfeited"),
  v.literal("adjustment"),
);
const waitlistStatus = v.union(
  v.literal("active"),
  v.literal("contacted"),
  v.literal("unsubscribed"),
);

export default defineSchema({
  users: defineTable({
    clerkSubject: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    displayName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageSource: v.optional(v.union(v.literal("oauth"), v.literal("upload"))),
    profileImageStorageId: v.optional(v.id("_storage")),
    role: userRole,
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_clerk_subject", ["clerkSubject"])
    .index("by_email", ["email"]),

  commitments: defineTable({
    userId: v.id("users"),
    name: v.string(),
    goalType,
    daysOfWeek: v.array(v.number()),
    targetPerDay: v.number(),
    durationDays: v.number(),
    pactAmount: v.number(),
    platformFeeAmount: v.optional(v.number()),
    currency: v.string(),
    forfeitDestination: forfeitDestination,
    startDate: v.string(),
    endDate: v.string(),
    timezone: v.string(),
    status: commitmentStatus,
    slotConsumedAt: v.optional(v.string()),
    paymentConfirmedAt: v.optional(v.string()),
    paymentConfirmedBy: v.optional(v.id("users")),
    paymentReference: v.optional(v.string()),
    paymentNote: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    earlyEndReason: v.optional(v.string()),
    earlyEndSettlementStatus: v.optional(earlyEndSettlementStatus),
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"]),

  checkIns: defineTable({
    userId: v.id("users"),
    commitmentId: v.id("commitments"),
    date: v.string(),
    proofUrl: v.optional(v.string()),
    proofStorageId: v.optional(v.id("_storage")),
    proofPrompt: v.optional(v.string()),
    proofLocation: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        accuracy: v.optional(v.number()),
        capturedAt: v.string(),
      }),
    ),
    submissionSignature: v.optional(v.string()),
    submissionStatement: v.optional(v.string()),
    stepCount: v.optional(v.number()),
    status: checkInStatus,
    verified: v.boolean(),
    rejectionReason: v.optional(v.string()),
    submittedAt: v.optional(v.string()),
    reviewedAt: v.optional(v.string()),
    reviewerId: v.optional(v.id("users")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_commitment", ["commitmentId"])
    .index("by_commitment_date", ["commitmentId", "date"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status_date", ["status", "date"])
    .index("by_user", ["userId"]),

  reviewActions: defineTable({
    checkInId: v.id("checkIns"),
    reviewerId: v.optional(v.id("users")),
    reviewerSource: v.optional(v.union(v.literal("app"), v.literal("slack"))),
    reviewerLabel: v.optional(v.string()),
    action: v.union(v.literal("approve"), v.literal("reject")),
    reason: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_check_in", ["checkInId"]),

  walletLedgerEntries: defineTable({
    userId: v.id("users"),
    commitmentId: v.optional(v.id("commitments")),
    checkInId: v.optional(v.id("checkIns")),
    amount: v.number(),
    currency: v.string(),
    type: v.union(
      v.literal("deposit_confirmed"),
      v.literal("approved_refund"),
      v.literal("forfeited"),
      v.literal("manual_payout"),
      v.literal("charity_transfer"),
    ),
    destination: v.union(
      v.literal("user"),
      v.literal("charity"),
      v.literal("razorpay"),
    ),
    externalReference: v.optional(v.string()),
    note: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_check_in", ["checkInId"])
    .index("by_commitment", ["commitmentId"])
    .index("by_created_at", ["createdAt"]),

  paymentOrders: defineTable({
    userId: v.id("users"),
    commitmentId: v.optional(v.id("commitments")),
    slotPurchaseId: v.optional(v.id("pactSlotPurchases")),
    purpose: v.optional(paymentPurpose),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.optional(v.string()),
    amount: v.number(),
    depositAmount: v.optional(v.number()),
    platformFeeAmount: v.optional(v.number()),
    currency: v.string(),
    status: paymentOrderStatus,
    receipt: v.string(),
    signature: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    paidAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_commitment", ["commitmentId"])
    .index("by_razorpay_order", ["razorpayOrderId"])
    .index("by_razorpay_payment", ["razorpayPaymentId"]),

  pactSlotPurchases: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    status: pactSlotPurchaseStatus,
    paymentOrderId: v.optional(v.id("paymentOrders")),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    paidAt: v.optional(v.string()),
    cancelledAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  pactSlotLedgerEntries: defineTable({
    userId: v.id("users"),
    slotPurchaseId: v.optional(v.id("pactSlotPurchases")),
    commitmentId: v.optional(v.id("commitments")),
    type: pactSlotLedgerType,
    quantity: v.number(),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    externalReference: v.optional(v.string()),
    note: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_commitment", ["commitmentId"])
    .index("by_purchase", ["slotPurchaseId"])
    .index("by_created_at", ["createdAt"]),

  manualPayoutRequests: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    upiId: v.optional(v.string()),
    payeeName: v.optional(v.string()),
    status: manualPayoutRequestStatus,
    note: v.optional(v.string()),
    externalReference: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    processedAt: v.optional(v.string()),
    processedBy: v.optional(v.id("users")),
    cancelledAt: v.optional(v.string()),
    cancelledBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"])
    .index("by_created_at", ["createdAt"]),

  earlyEndSettlementRequests: defineTable({
    userId: v.id("users"),
    commitmentId: v.id("commitments"),
    status: earlyEndSettlementStatus,
    reason: v.optional(v.string()),
    requestedAt: v.string(),
    updatedAt: v.string(),
    resolvedAt: v.optional(v.string()),
    resolvedBy: v.optional(v.id("users")),
    refundAmount: v.optional(v.number()),
    forfeitAmount: v.optional(v.number()),
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_commitment", ["commitmentId"])
    .index("by_status", ["status"])
    .index("by_requested_at", ["requestedAt"]),

  refundWithdrawals: defineTable({
    userId: v.id("users"),
    paymentOrderId: v.id("paymentOrders"),
    razorpayPaymentId: v.string(),
    razorpayRefundId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: refundWithdrawalStatus,
    failureReason: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    processedAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_payment_order", ["paymentOrderId"])
    .index("by_created_at", ["createdAt"]),

  betaUsers: defineTable({
    slug: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_slug", ["slug"]),

  betaCommitments: defineTable({
    userId: v.id("betaUsers"),
    slug: v.string(),
    title: v.string(),
    category: betaCommitmentCategory,
    frequencyLabel: v.string(),
    frequencyPerWeek: v.number(),
    daysOfWeek: v.array(v.number()),
    plannedSubmissions: v.number(),
    totalAmount: v.number(),
    amountPerSubmission: v.number(),
    currency: v.string(),
    cycleStartDate: v.string(),
    cycleEndDate: v.string(),
    timezone: v.string(),
    status: betaCommitmentStatus,
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  betaSubmissions: defineTable({
    userId: v.id("betaUsers"),
    commitmentId: v.id("betaCommitments"),
    date: v.string(),
    status: betaSubmissionStatus,
    proofUrl: v.optional(v.string()),
    note: v.optional(v.string()),
    submittedAt: v.optional(v.string()),
    reviewedAt: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_commitment", ["commitmentId"])
    .index("by_commitment_date", ["commitmentId", "date"])
    .index("by_user_date", ["userId", "date"])
    .index("by_status_date", ["status", "date"]),

  betaLedgerEntries: defineTable({
    userId: v.id("betaUsers"),
    commitmentId: v.optional(v.id("betaCommitments")),
    submissionId: v.optional(v.id("betaSubmissions")),
    type: betaLedgerEntryType,
    amount: v.number(),
    currency: v.string(),
    occurredAt: v.optional(v.string()),
    externalReference: v.optional(v.string()),
    note: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_commitment", ["commitmentId"])
    .index("by_submission", ["submissionId"])
    .index("by_created_at", ["createdAt"]),

  waitlistSignups: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    pagePath: v.optional(v.string()),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    status: waitlistStatus,
    submissionCount: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastSubmittedAt: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_created_at", ["createdAt"])
    .index("by_status_created_at", ["status", "createdAt"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: notificationType,
    title: v.string(),
    body: v.string(),
    commitmentId: v.optional(v.id("commitments")),
    checkInId: v.optional(v.id("checkIns")),
    route: v.optional(v.string()),
    readAt: v.optional(v.string()),
    emailSubject: v.optional(v.string()),
    emailBody: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user_created_at", ["userId", "createdAt"])
    .index("by_user_read", ["userId", "readAt"])
    .index("by_user_dedupe", ["userId", "dedupeKey"]),

  notificationDeliveries: defineTable({
    notificationId: v.id("notifications"),
    userId: v.id("users"),
    channel: v.literal("email"),
    status: notificationDeliveryStatus,
    provider: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_notification", ["notificationId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
});
