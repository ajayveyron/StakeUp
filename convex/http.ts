import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { asCheckInId, asCommitmentId } from "./slack";

type SlackUser = {
  id: string;
  username?: string;
  name?: string;
};

type SlackAction = {
  action_id?: string;
  value?: string;
};

type SlackView = {
  private_metadata?: string;
  state?: {
    values?: Record<string, Record<string, { value?: string }>>;
  };
};

type SlackModalMetadata = {
  checkInId: string;
  responseUrl?: string;
};

type SlackPayload = {
  type: "block_actions" | "view_submission";
  trigger_id?: string;
  response_url?: string;
  user: SlackUser;
  actions?: SlackAction[];
  view?: SlackView;
};

function slackJson(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function slackAdminUserIds() {
  return new Set(
    (
      process.env.SLACK_ADMIN_USER_IDS ??
      process.env.SLACK_ALLOWED_ADMIN_USER_IDS ??
      ""
    )
      .split(",")
      .map((id: string) => id.trim())
      .filter(Boolean),
  );
}

function isAuthorizedSlackAdmin(user: SlackUser | undefined) {
  if (!user?.id) return false;
  const allowed = slackAdminUserIds();
  return allowed.size > 0 && allowed.has(user.id);
}

function unauthorizedSlackResponse(payload: SlackPayload) {
  if (payload.type === "view_submission") {
    return slackJson({
      response_action: "errors",
      errors: {
        rejection_reason_block:
          "This Slack account is not allowed to review Pact Raven proof.",
      },
    });
  }
  return new Response("Forbidden", { status: 403 });
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function equalHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function verifySlackSignature(request: Request, rawBody: string) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;

  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 60 * 5) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`v0:${timestamp}:${rawBody}`),
  );

  return equalHex(`v0=${toHex(signed)}`, signature);
}

async function callSlack(method: string, payload: Record<string, unknown>) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as { ok?: boolean; error?: string };

  if (!response.ok || !result.ok) {
    throw new Error(
      `Slack ${method} failed: ${result.error ?? response.status}`,
    );
  }

  return result;
}

async function postSlackResponse(
  responseUrl: string | undefined,
  payload: Record<string, unknown>,
) {
  if (!responseUrl) return;
  await fetch(responseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function replaceSlackReviewMessage(
  responseUrl: string | undefined,
  args: {
    status: "approved" | "rejected";
    reviewer: SlackUser;
    reason?: string;
  },
) {
  const reviewer =
    args.reviewer.username || args.reviewer.name || args.reviewer.id;
  const statusLabel = args.status === "approved" ? "Approved" : "Rejected";
  const statusText =
    args.status === "approved"
      ? `*Approved by* ${reviewer}\nThe user's refund credit is waiting for manual UPI payout.`
      : `*Rejected by* ${reviewer}\n*Reason*\n${args.reason ?? "No reason provided"}\nThe amount is treated as forfeited.`;

  await postSlackResponse(responseUrl, {
    replace_original: true,
    text:
      args.status === "approved"
        ? `Pact Raven proof approved by ${reviewer}`
        : `Pact Raven proof rejected by ${reviewer}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text:
            args.status === "approved"
              ? "Proof approved"
              : `Proof ${statusLabel.toLowerCase()}`,
          emoji: false,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: statusText,
        },
      },
    ],
  });
}

async function replaceSlackPaymentMessage(
  responseUrl: string | undefined,
  args: {
    status: "activated" | "discarded";
    reviewer: SlackUser;
  },
) {
  const reviewer =
    args.reviewer.username || args.reviewer.name || args.reviewer.id;
  const isActivated = args.status === "activated";

  await postSlackResponse(responseUrl, {
    replace_original: true,
    text: isActivated
      ? `Pact Raven deposit confirmed and pact activated by ${reviewer}`
      : `Pact Raven pending pact discarded by ${reviewer}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: isActivated ? "Deposit confirmed" : "Pending pact discarded",
          emoji: false,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: isActivated
            ? `*Activated by* ${reviewer}\nThe pact deposit is treated as received and the pact is now active.`
            : `*Discarded by* ${reviewer}\nThe pending pact was archived without activation.`,
        },
      },
    ],
  });
}

function encodeSlackModalMetadata(metadata: SlackModalMetadata) {
  return JSON.stringify(metadata);
}

function decodeSlackModalMetadata(
  value: string | undefined,
): SlackModalMetadata {
  if (!value) return { checkInId: "" };
  try {
    const parsed = JSON.parse(value) as Partial<SlackModalMetadata>;
    if (typeof parsed.checkInId === "string") {
      return {
        checkInId: parsed.checkInId,
        responseUrl:
          typeof parsed.responseUrl === "string"
            ? parsed.responseUrl
            : undefined,
      };
    }
  } catch {
    // Older modals stored only the check-in id as private_metadata.
  }
  return { checkInId: value };
}

function rejectionReason(view: SlackView | undefined) {
  const values = view?.state?.values ?? {};
  for (const block of Object.values(values)) {
    const input = block.rejection_reason;
    if (input?.value) return input.value.trim();
  }
  return "";
}

const http = httpRouter();

const waitlistEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

http.route({
  path: "/waitlist/signup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let payload: {
      email?: unknown;
      source?: unknown;
      pagePath?: unknown;
      referrer?: unknown;
    };

    try {
      payload = (await request.json()) as typeof payload;
    } catch {
      return json({ error: "Invalid JSON." }, { status: 400 });
    }

    const email =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!waitlistEmailPattern.test(email)) {
      return json({ error: "Enter a valid email." }, { status: 400 });
    }

    const ip = clientIp(request);
    const { allowed } = await ctx.runMutation(
      internal.waitlist.consumeRateLimit,
      { key: ip ?? "unknown" },
    );
    if (!allowed) {
      return json(
        { error: "Too many signups. Try again later." },
        { status: 429 },
      );
    }

    const result = await ctx.runMutation(internal.waitlist.capture, {
      email,
      source: typeof payload.source === "string" ? payload.source : "website",
      pagePath: typeof payload.pagePath === "string" ? payload.pagePath : undefined,
      referrer: typeof payload.referrer === "string" ? payload.referrer : undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: clientIp(request),
    });

    return json({ ok: true, created: result.created });
  }),
});

http.route({
  path: "/slack/interactions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    if (!(await verifySlackSignature(request, rawBody))) {
      return new Response("Unauthorized", { status: 401 });
    }

    const payloadParam = new URLSearchParams(rawBody).get("payload");
    if (!payloadParam) return new Response("ok");

    const payload = JSON.parse(payloadParam) as SlackPayload;
    if (!isAuthorizedSlackAdmin(payload.user)) {
      return unauthorizedSlackResponse(payload);
    }

    if (payload.type === "block_actions") {
      const action = payload.actions?.[0];
      const value = action?.value;

      if (!action?.action_id || !value) return new Response("ok");

      if (action.action_id === "approve_check_in") {
        await ctx.runMutation(internal.slack.approveFromSlack, {
          checkInId: asCheckInId(value),
          slackUserId: payload.user.id,
          username: payload.user.username,
          name: payload.user.name,
        });
        await replaceSlackReviewMessage(payload.response_url, {
          status: "approved",
          reviewer: payload.user,
        });
        return new Response("ok");
      }

      if (action.action_id === "reject_check_in") {
        if (!payload.trigger_id) return new Response("ok");

        await callSlack("views.open", {
          trigger_id: payload.trigger_id,
          view: {
            type: "modal",
            callback_id: "reject_check_in_modal",
            private_metadata: encodeSlackModalMetadata({
              checkInId: value,
              responseUrl: payload.response_url,
            }),
            title: {
              type: "plain_text",
              text: "Reject proof",
              emoji: false,
            },
            submit: {
              type: "plain_text",
              text: "Reject",
              emoji: false,
            },
            close: {
              type: "plain_text",
              text: "Cancel",
              emoji: false,
            },
            blocks: [
              {
                type: "input",
                block_id: "rejection_reason_block",
                label: {
                  type: "plain_text",
                  text: "Rejection reason",
                  emoji: false,
                },
                element: {
                  type: "plain_text_input",
                  action_id: "rejection_reason",
                  multiline: true,
                  placeholder: {
                    type: "plain_text",
                    text: "Example: proof link is private",
                    emoji: false,
                  },
                },
              },
            ],
          },
        });

        return new Response("ok");
      }

      if (action.action_id === "activate_commitment") {
        await ctx.runMutation(internal.slack.activateCommitmentFromSlack, {
          commitmentId: asCommitmentId(value),
          slackUserId: payload.user.id,
          username: payload.user.username,
          name: payload.user.name,
        });
        await replaceSlackPaymentMessage(payload.response_url, {
          status: "activated",
          reviewer: payload.user,
        });
        return new Response("ok");
      }

      if (action.action_id === "discard_commitment") {
        await ctx.runMutation(internal.slack.discardCommitmentFromSlack, {
          commitmentId: asCommitmentId(value),
          slackUserId: payload.user.id,
          username: payload.user.username,
          name: payload.user.name,
        });
        await replaceSlackPaymentMessage(payload.response_url, {
          status: "discarded",
          reviewer: payload.user,
        });
        return new Response("ok");
      }
    }

    if (payload.type === "view_submission") {
      const metadata = decodeSlackModalMetadata(payload.view?.private_metadata);
      const checkInId = metadata.checkInId;
      const reason = rejectionReason(payload.view);

      if (!checkInId || !reason) {
        return slackJson({
          response_action: "errors",
          errors: {
            rejection_reason_block: "Add a rejection reason.",
          },
        });
      }

      try {
        await ctx.runMutation(internal.slack.rejectFromSlack, {
          checkInId: asCheckInId(checkInId),
          reason,
          slackUserId: payload.user.id,
          username: payload.user.username,
          name: payload.user.name,
        });
      } catch (error) {
        return slackJson({
          response_action: "errors",
          errors: {
            rejection_reason_block:
              error instanceof Error
                ? error.message
                : "Could not reject proof.",
          },
        });
      }

      await replaceSlackReviewMessage(metadata.responseUrl, {
        status: "rejected",
        reviewer: payload.user,
        reason,
      });

      return slackJson({ response_action: "clear" });
    }

    return new Response("ok");
  }),
});

export default http;
