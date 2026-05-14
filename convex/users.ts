import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  getCurrentUserDoc,
  identityEmail,
  identityImage,
  identityName,
  identityPhone,
  isAdminEmail,
  requireClerkIdentity,
  requireUser,
} from "./lib/auth";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return user;
  },
});

export const upsertCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireClerkIdentity(ctx);
    const now = new Date().toISOString();
    const email = identityEmail(identity);
    const phone = identityPhone(identity);
    const displayName = identityName(identity);
    const imageUrl = identityImage(identity);
    const role = isAdminEmail(email) ? "admin" : "user";
    const existing = await getCurrentUserDoc(ctx.db, identity.subject);

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        phone,
        displayName,
        imageUrl,
        role,
        updatedAt: now,
      });
      return { id: existing._id, role };
    }

    const userId = await ctx.db.insert("users", {
      clerkSubject: identity.subject,
      email,
      phone,
      displayName,
      imageUrl,
      role,
      createdAt: now,
      updatedAt: now,
    });

    return { id: userId, role };
  },
});

export const byId = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await requireUser(ctx);
    if (currentUser._id !== args.id && currentUser.role !== "admin") {
      throw new Error("Access denied");
    }
    return await ctx.db.get(args.id);
  },
});
