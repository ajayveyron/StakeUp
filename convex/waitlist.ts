import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!emailPattern.test(email)) {
    throw new Error("Enter a valid email.");
  }
  return email;
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 1000) : undefined;
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 20;

export const consumeRateLimit = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const key = args.key.slice(0, 200);
    const now = Date.now();
    const existing = await ctx.db
      .query("waitlistRateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!existing || now - existing.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
      if (existing) {
        await ctx.db.patch(existing._id, { count: 1, windowStartedAt: now });
      } else {
        await ctx.db.insert("waitlistRateLimits", {
          key,
          count: 1,
          windowStartedAt: now,
        });
      }
      return { allowed: true };
    }

    if (existing.count >= RATE_LIMIT_MAX) {
      return { allowed: false };
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { allowed: true };
  },
});

export const capture = internalMutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
    pagePath: v.optional(v.string()),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const payload = {
      source: optionalText(args.source),
      pagePath: optionalText(args.pagePath),
      referrer: optionalText(args.referrer),
      userAgent: optionalText(args.userAgent),
      ipAddress: optionalText(args.ipAddress),
      status: "active" as const,
      updatedAt: now,
      lastSubmittedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...payload,
        submissionCount: existing.submissionCount + 1,
      });
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("waitlistSignups", {
      email,
      ...payload,
      submissionCount: 1,
      createdAt: now,
    });
    return { id, created: true };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("waitlistSignups")
      .withIndex("by_created_at")
      .order("desc")
      .take(500);
  },
});
