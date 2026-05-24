import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

import {
  isFreshCheckoutPreparation,
  isLocalRazorpayOrderId,
} from "../../convex/lib/payments";
import { normalizeContentProofUrl } from "../../convex/lib/proofUrls";
import { escapeSlackMrkdwn } from "../../convex/lib/slackText";

const require = createRequire(import.meta.url);
const mobileServer = require("../../artifacts/mobile/server/serve.js") as {
  escapeHtml: (value: string) => string;
  normalizeRequestHost: (req: { headers: Record<string, string> }) => string;
  normalizeRequestProtocol: (req: { headers: Record<string, string> }) => string;
};

describe("security hardening helpers", () => {
  it("requires content proof URLs to be valid https URLs", () => {
    assert.equal(
      normalizeContentProofUrl(" https://example.com/post?x=1#fragment "),
      "https://example.com/post?x=1",
    );

    assert.throws(
      () => normalizeContentProofUrl("http://example.com/post"),
      /valid https link/,
    );
    assert.throws(
      () => normalizeContentProofUrl("httpx://example.com/post"),
      /valid https link/,
    );
    assert.throws(
      () => normalizeContentProofUrl("javascript:alert(1)"),
      /valid https link/,
    );
  });

  it("escapes Slack mrkdwn control characters in user-controlled text", () => {
    assert.equal(
      escapeSlackMrkdwn("<@U123> & <https://evil.example|click>"),
      "&lt;@U123&gt; &amp; &lt;https://evil.example|click&gt;",
    );
  });

  it("recognizes local Razorpay placeholders and stale checkout attempts", () => {
    const now = new Date("2026-05-24T00:00:00.000Z");

    assert.equal(isLocalRazorpayOrderId("pending:slot_user_1"), true);
    assert.equal(isLocalRazorpayOrderId("order_real_1"), false);
    assert.equal(
      isFreshCheckoutPreparation("2026-05-23T23:59:00.000Z", now),
      true,
    );
    assert.equal(
      isFreshCheckoutPreparation("2026-05-23T23:55:00.000Z", now),
      false,
    );
  });

  it("rejects hostile host headers before rendering the standalone landing page", () => {
    assert.equal(
      mobileServer.normalizeRequestHost({
        headers: {
          "x-forwarded-host": "APP.PACTRAVEN.COM, proxy.local",
          host: "ignored.example",
        },
      }),
      "app.pactraven.com",
    );
    assert.equal(
      mobileServer.normalizeRequestProtocol({
        headers: { "x-forwarded-proto": "javascript" },
      }),
      "https",
    );
    assert.throws(
      () =>
        mobileServer.normalizeRequestHost({
          headers: { "x-forwarded-host": 'evil.example";alert(1);//' },
        }),
      /Invalid host header/,
    );
    assert.equal(
      mobileServer.escapeHtml('exps://app.pactraven.com/"<&'),
      "exps://app.pactraven.com/&quot;&lt;&amp;",
    );
  });
});
