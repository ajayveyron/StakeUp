export const config = {
  runtime: "edge",
};

declare const process: {
  env: Record<string, string | undefined>;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

function convexSiteUrl() {
  const explicit = process.env.CONVEX_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const convexUrl = process.env.CONVEX_URL;
  if (convexUrl?.includes(".convex.cloud")) {
    return convexUrl.replace(".convex.cloud", ".convex.site").replace(/\/$/, "");
  }
  return undefined;
}

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, { status: 405 });
  }

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
  if (!emailPattern.test(email)) {
    return json({ error: "Enter a valid email." }, { status: 400 });
  }

  const siteUrl = convexSiteUrl();
  if (!siteUrl) {
    return json({ error: "Waitlist storage is not configured." }, { status: 503 });
  }

  const response = await fetch(`${siteUrl}/waitlist/signup`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": request.headers.get("user-agent") ?? "pact-raven-website",
      "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
    },
    body: JSON.stringify({
      email,
      source: typeof payload.source === "string" ? payload.source : "website",
      pagePath:
        typeof payload.pagePath === "string" ? payload.pagePath : undefined,
      referrer:
        typeof payload.referrer === "string" ? payload.referrer : undefined,
    }),
  });

  if (response.status === 429) {
    return json(
      { error: "Too many signups. Try again later." },
      { status: 429 },
    );
  }

  if (!response.ok) {
    return json(
      { error: "Could not save waitlist signup. Try again." },
      { status: 502 },
    );
  }

  return json({ ok: true });
}
