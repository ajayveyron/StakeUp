import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const repoRoot = resolve(__dirname, "../..");

function json(response: ServerResponse, status: number, payload: unknown) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload));
}

function convexSiteUrl(env: Record<string, string>) {
  if (env.CONVEX_SITE_URL) return env.CONVEX_SITE_URL.replace(/\/$/, "");
  if (env.CONVEX_URL?.includes(".convex.cloud")) {
    return env.CONVEX_URL.replace(".convex.cloud", ".convex.site").replace(
      /\/$/,
      "",
    );
  }
  return undefined;
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function waitlistApiPlugin(): Plugin {
  return {
    name: "pact-raven-waitlist-api",
    configureServer(server) {
      const env = loadEnv("", repoRoot, "");
      const siteUrl = convexSiteUrl(env);

      server.middlewares.use("/api/waitlist", (request, response) => {
        void (async () => {
          if (request.method !== "POST") {
            json(response, 405, { error: "Method not allowed." });
            return;
          }

          let payload: {
            email?: unknown;
            source?: unknown;
            pagePath?: unknown;
            referrer?: unknown;
          };

          try {
            payload = JSON.parse(await readBody(request)) as typeof payload;
          } catch {
            json(response, 400, { error: "Invalid JSON." });
            return;
          }

          const email =
            typeof payload.email === "string"
              ? payload.email.trim().toLowerCase()
              : "";
          if (!emailPattern.test(email)) {
            json(response, 400, { error: "Enter a valid email." });
            return;
          }

          if (!siteUrl) {
            json(response, 503, { error: "Waitlist storage is not configured." });
            return;
          }

          const upstream = await fetch(`${siteUrl}/waitlist/signup`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "user-agent":
                request.headers["user-agent"] ?? "pact-raven-website-dev",
              "x-forwarded-for":
                request.headers["x-forwarded-for"]?.toString() ?? "",
            },
            body: JSON.stringify({
              email,
              source:
                typeof payload.source === "string" ? payload.source : "website",
              pagePath:
                typeof payload.pagePath === "string"
                  ? payload.pagePath
                  : undefined,
              referrer:
                typeof payload.referrer === "string"
                  ? payload.referrer
                  : undefined,
            }),
          });

          if (!upstream.ok) {
            json(response, 502, {
              error: "Could not save waitlist signup. Try again.",
            });
            return;
          }

          json(response, 200, { ok: true });
        })().catch(() => {
          json(response, 500, { error: "Could not save waitlist signup." });
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), waitlistApiPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        workoutAccountability: resolve(
          __dirname,
          "workout-accountability.html",
        ),
        terms: resolve(__dirname, "terms.html"),
        privacy: resolve(__dirname, "privacy.html"),
        refunds: resolve(__dirname, "refund-cancellation.html"),
        proofRules: resolve(__dirname, "proof-rules.html"),
        support: resolve(__dirname, "support.html"),
        notFound: resolve(__dirname, "404.html"),
        stickerCobalt: resolve(__dirname, "sticker-cobalt.html"),
      },
    },
  },
  server: {
    port: 5175,
    fs: {
      allow: ["../.."],
    },
  },
});
