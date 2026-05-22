import type { AuthConfig } from "convex/server";

const clerkIssuerDomains = (
  process.env.CLERK_JWT_ISSUER_DOMAINS ??
  process.env.CLERK_JWT_ISSUER_DOMAIN ??
  ""
)
  .split(",")
  .map((domain) => domain.trim())
  .filter((domain) => domain && !domain.includes("your-clerk-instance"));

export default {
  providers: clerkIssuerDomains.flatMap((domain) => [
    {
      domain,
      applicationID: "convex",
    },
    {
      type: "customJwt",
      issuer: domain,
      jwks: `${domain}/.well-known/jwks.json`,
      algorithm: "RS256",
    },
  ]),
} satisfies AuthConfig;
