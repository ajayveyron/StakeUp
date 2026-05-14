import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { asCheckInId } from "./slack";

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
    ["sign"]
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`v0:${timestamp}:${rawBody}`)
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
    throw new Error(`Slack ${method} failed: ${result.error ?? response.status}`);
  }

  return result;
}

async function postSlackResponse(responseUrl: string | undefined, text: string) {
  if (!responseUrl) return;
  await fetch(responseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      response_type: "ephemeral",
      replace_original: false,
      text,
    }),
  });
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

    if (payload.type === "block_actions") {
      const action = payload.actions?.[0];
      const checkInId = action?.value;

      if (!action?.action_id || !checkInId) return new Response("ok");

      if (action.action_id === "approve_check_in") {
        await ctx.runMutation(internal.slack.approveFromSlack, {
          checkInId: asCheckInId(checkInId),
          slackUserId: payload.user.id,
          username: payload.user.username,
          name: payload.user.name,
        });
        await postSlackResponse(payload.response_url, "Approved.");
        return new Response("ok");
      }

      if (action.action_id === "reject_check_in") {
        if (!payload.trigger_id) return new Response("ok");

        await callSlack("views.open", {
          trigger_id: payload.trigger_id,
          view: {
            type: "modal",
            callback_id: "reject_check_in_modal",
            private_metadata: checkInId,
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
    }

    if (payload.type === "view_submission") {
      const checkInId = payload.view?.private_metadata;
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
              error instanceof Error ? error.message : "Could not reject proof.",
          },
        });
      }

      return slackJson({ response_action: "clear" });
    }

    return new Response("ok");
  }),
});

export default http;
