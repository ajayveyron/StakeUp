import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
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

function normalizeImageUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

async function withResolvedProfileImage(ctx: QueryCtx, user: Doc<"users">) {
  const shouldResolveUpload =
    user.imageSource === "upload" ||
    (!user.imageSource && user.profileImageStorageId);
  const uploadedImageUrl =
    shouldResolveUpload && user.profileImageStorageId
      ? await ctx.storage.getUrl(user.profileImageStorageId)
      : null;

  return {
    ...user,
    imageUrl: uploadedImageUrl ?? user.imageUrl,
  };
}

function normalizeWhatsAppNumber(value: string) {
  const compact = value.trim().replace(/[^\d+]/g, "");
  if (!compact) throw new Error("Enter a WhatsApp mobile number");

  const normalized = compact.startsWith("+")
    ? `+${compact.slice(1).replace(/\+/g, "")}`
    : compact;
  const digits = normalized.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 15) {
    throw new Error("Enter a valid WhatsApp mobile number");
  }

  if (normalized.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await withResolvedProfileImage(ctx, user);
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
    const imageUrl = normalizeImageUrl(identityImage(identity));
    const role = isAdminEmail(email) ? "admin" : "user";
    const existing = await getCurrentUserDoc(ctx.db, identity.subject);

    if (existing) {
      const shouldSyncOAuthImage =
        imageUrl &&
        !existing.profileImageStorageId &&
        existing.imageSource !== "upload";
      await ctx.db.patch(existing._id, {
        email,
        phone,
        displayName,
        ...(shouldSyncOAuthImage ? { imageUrl, imageSource: "oauth" } : {}),
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
      imageSource: imageUrl ? "oauth" : undefined,
      role,
      createdAt: now,
      updatedAt: now,
    });

    return { id: userId, role };
  },
});

export const syncCurrentUserOAuthImage = mutation({
  args: { imageUrl: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const imageUrl = normalizeImageUrl(args.imageUrl);
    if (!imageUrl) {
      throw new Error("Profile image URL is invalid");
    }
    if (user.profileImageStorageId || user.imageSource === "upload") {
      return { id: user._id, skipped: true };
    }

    const now = new Date().toISOString();
    await ctx.db.patch(user._id, {
      imageUrl,
      imageSource: "oauth",
      updatedAt: now,
    });
    return { id: user._id, skipped: false };
  },
});

export const updateWhatsAppNumber = mutation({
  args: { whatsappNumber: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const whatsappNumber = normalizeWhatsAppNumber(args.whatsappNumber);
    const now = new Date().toISOString();

    await ctx.db.patch(user._id, {
      whatsappNumber,
      updatedAt: now,
    });

    return { whatsappNumber };
  },
});

export const byId = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await requireUser(ctx);
    if (currentUser._id !== args.id && currentUser.role !== "admin") {
      throw new Error("Access denied");
    }
    const user = await ctx.db.get(args.id);
    return user ? await withResolvedProfileImage(ctx, user) : null;
  },
});

export const generateProfileImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateCurrentUserProfileImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = new Date().toISOString();
    await ctx.db.patch(user._id, {
      profileImageStorageId: args.storageId,
      imageSource: "upload",
      updatedAt: now,
    });
    return { id: user._id };
  },
});
