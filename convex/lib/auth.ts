import type { GenericDatabaseReader } from "convex/server";

import type { DataModel, Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthCtx = Pick<QueryCtx | MutationCtx, "auth" | "db">;

type IdentityValue = string | null | undefined;

function normalizeEmail(email: IdentityValue): string | undefined {
  return email ? email.trim().toLowerCase() : undefined;
}

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: IdentityValue): boolean {
  const normalized = normalizeEmail(email);
  return normalized ? adminEmails().has(normalized) : false;
}

export async function getCurrentUserDoc(
  db: GenericDatabaseReader<DataModel>,
  clerkSubject: string
): Promise<Doc<"users"> | null> {
  return await db
    .query("users")
    .withIndex("by_clerk_subject", (q) => q.eq("clerkSubject", clerkSubject))
    .unique();
}

export async function requireClerkIdentity(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity;
}

export async function requireUser(ctx: AuthCtx): Promise<Doc<"users">> {
  const identity = await requireClerkIdentity(ctx);
  const user = await getCurrentUserDoc(ctx.db, identity.subject);
  if (!user) {
    throw new Error("User profile has not been initialized");
  }
  return user;
}

export async function requireAdmin(ctx: AuthCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

export function identityEmail(identity: {
  email?: string | null;
  [key: string]: unknown;
}): string | undefined {
  return normalizeEmail(identity.email);
}

export function identityPhone(identity: {
  phoneNumber?: string | null;
  phone?: string | null;
  [key: string]: unknown;
}): string | undefined {
  return identity.phoneNumber ?? identity.phone ?? undefined;
}

export function identityName(identity: {
  name?: string | null;
  nickname?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  [key: string]: unknown;
}): string | undefined {
  if (identity.name) return identity.name;
  if (identity.nickname) return identity.nickname;
  const parts = [identity.givenName, identity.familyName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export function identityImage(identity: {
  pictureUrl?: string | null;
  picture?: string | null;
  imageUrl?: string | null;
  [key: string]: unknown;
}): string | undefined {
  return identity.pictureUrl ?? identity.picture ?? identity.imageUrl ?? undefined;
}
