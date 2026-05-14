import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const goalType = v.union(v.literal("content"), v.literal("steps"));
const checkInStatus = v.union(
  v.literal("under_review"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("missed")
);
const forfeitDestination = v.union(
  v.literal("friend"),
  v.literal("reward_pool")
);
const commitmentStatus = v.union(
  v.literal("pending_payment"),
  v.literal("active"),
  v.literal("deleted")
);
const userRole = v.union(v.literal("user"), v.literal("admin"));
const notificationType = v.union(
  v.literal("payment_pending"),
  v.literal("payment_confirmed"),
  v.literal("payment_discarded"),
  v.literal("check_in_approved"),
  v.literal("check_in_rejected"),
  v.literal("manual_payout_recorded")
);
const notificationDeliveryStatus = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("skipped"),
  v.literal("failed")
);

export default defineSchema({
  users: defineTable({
    clerkSubject: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    displayName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
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
    currency: v.string(),
    forfeitDestination: forfeitDestination,
    friendName: v.optional(v.string()),
    friendContact: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    timezone: v.string(),
    status: commitmentStatus,
    paymentConfirmedAt: v.optional(v.string()),
    paymentConfirmedBy: v.optional(v.id("users")),
    paymentReference: v.optional(v.string()),
    paymentNote: v.optional(v.string()),
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
      v.literal("manual_payout")
    ),
    destination: v.union(
      v.literal("user"),
      v.literal("friend"),
      v.literal("reward_pool"),
      v.literal("admin_upi")
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
