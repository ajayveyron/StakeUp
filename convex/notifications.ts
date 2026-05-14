import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireUser } from "./lib/auth";

const deliveryStatus = v.union(
  v.literal("sent"),
  v.literal("skipped"),
  v.literal("failed")
);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmailHtml(args: { title: string; body: string }) {
  const paragraphs = args.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#0A0A0F;color:#FFFFFF;font-family:Inter,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <div style="border:1px solid #222230;background:#111116;border-radius:14px;padding:24px">
        <p style="margin:0 0 8px;color:#00C853;font-size:13px;font-weight:700">Pact Raven</p>
        <h1 style="margin:0 0 20px;color:#FFFFFF;font-size:22px;line-height:1.25">${escapeHtml(args.title)}</h1>
        <div style="color:#D7D7E0;font-size:15px">${paragraphs}</div>
      </div>
      <p style="margin:16px 0 0;color:#8A8A9A;font-size:12px;line-height:1.5">This is a transactional update for your Pact Raven account.</p>
    </div>
  </body>
</html>`;
}

function getEmailFromEnv() {
  return process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
}

function errorMessage(value: unknown) {
  return value instanceof Error ? value.message : String(value);
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created_at", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return notifications.map((notification) => ({
      id: notification._id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      route: notification.route,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    }));
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("readAt", undefined)
      )
      .take(100);
    return unread.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found");
    }
    if (notification.readAt) return { ok: true };
    const now = new Date().toISOString();
    await ctx.db.patch(notification._id, { readAt: now, updatedAt: now });
    return { ok: true };
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("readAt", undefined)
      )
      .take(100);
    const now = new Date().toISOString();
    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, { readAt: now, updatedAt: now })
      )
    );
    return { ok: true, count: unread.length };
  },
});

export const emailDeliveryContext = internalQuery({
  args: { deliveryId: v.id("notificationDeliveries") },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) return null;
    const notification = await ctx.db.get(delivery.notificationId);
    const user = await ctx.db.get(delivery.userId);
    if (!notification || !user) return null;

    return {
      delivery: {
        id: delivery._id,
        status: delivery.status,
      },
      notification: {
        title: notification.title,
        body: notification.body,
        emailSubject: notification.emailSubject,
        emailBody: notification.emailBody,
      },
      user: {
        email: user.email,
      },
    };
  },
});

export const markEmailDelivery = internalMutation({
  args: {
    deliveryId: v.id("notificationDeliveries"),
    status: deliveryStatus,
    providerMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.deliveryId, {
      status: args.status,
      providerMessageId: args.providerMessageId,
      error: args.error,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const sendEmailForDelivery = internalAction({
  args: { deliveryId: v.id("notificationDeliveries") },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.notifications.emailDeliveryContext, {
      deliveryId: args.deliveryId,
    });
    if (!context || context.delivery.status !== "pending") return;

    const apiKey = process.env.RESEND_API_KEY;
    const from = getEmailFromEnv();
    const to = context.user.email;

    if (!to) {
      await ctx.runMutation(internal.notifications.markEmailDelivery, {
        deliveryId: args.deliveryId,
        status: "skipped",
        error: "User has no email address",
      });
      return;
    }

    if (!apiKey || !from) {
      await ctx.runMutation(internal.notifications.markEmailDelivery, {
        deliveryId: args.deliveryId,
        status: "skipped",
        error: "RESEND_API_KEY and EMAIL_FROM are required",
      });
      return;
    }

    const subject =
      context.notification.emailSubject ?? context.notification.title;
    const body = context.notification.emailBody ?? context.notification.body;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": args.deliveryId as Id<"notificationDeliveries">,
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          text: body,
          html: renderEmailHtml({ title: subject, body }),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { id?: string; message?: string; error?: string }
        | null;

      if (!response.ok) {
        await ctx.runMutation(internal.notifications.markEmailDelivery, {
          deliveryId: args.deliveryId,
          status: "failed",
          error:
            payload?.message ??
            payload?.error ??
            `Resend returned ${response.status}`,
        });
        return;
      }

      await ctx.runMutation(internal.notifications.markEmailDelivery, {
        deliveryId: args.deliveryId,
        status: "sent",
        providerMessageId: payload?.id,
      });
    } catch (error) {
      await ctx.runMutation(internal.notifications.markEmailDelivery, {
        deliveryId: args.deliveryId,
        status: "failed",
        error: errorMessage(error),
      });
    }
  },
});
