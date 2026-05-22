import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import React, { useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;
const adminRedirectUrl =
  typeof window === "undefined" ? "https://admin.pactraven.com/" : `${window.location.origin}/`;

function MissingSetup() {
  return (
    <main className="setup-screen">
      <section className="setup-panel">
        <p className="eyebrow">Pact Raven Admin</p>
        <h1>Environment required</h1>
        <p>
          Add <code>VITE_CLERK_PUBLISHABLE_KEY</code> and{" "}
          <code>VITE_CONVEX_URL</code> to{" "}
          <code>artifacts/admin/.env.local</code>.
        </p>
      </section>
    </main>
  );
}

function Root() {
  if (!clerkPublishableKey || !convexClient) return <MissingSetup />;

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      signInFallbackRedirectUrl={adminRedirectUrl}
      signInForceRedirectUrl={adminRedirectUrl}
      signUpFallbackRedirectUrl={adminRedirectUrl}
      signUpForceRedirectUrl={adminRedirectUrl}
    >
      <SignedOut>
        <main className="setup-screen">
          <section className="setup-panel">
            <p className="eyebrow">Pact Raven Admin</p>
            <h1>Sign in</h1>
            <SignInButton
              fallbackRedirectUrl={adminRedirectUrl}
              forceRedirectUrl={adminRedirectUrl}
              mode="modal"
              signUpFallbackRedirectUrl={adminRedirectUrl}
              signUpForceRedirectUrl={adminRedirectUrl}
            >
              <button className="primary-button" type="button">
                Continue with Clerk
              </button>
            </SignInButton>
          </section>
        </main>
      </SignedOut>
      <SignedIn>
        <ConvexProviderWithAuth client={convexClient} useAuth={useClerkConvexAuth}>
          <App userButton={<UserButton />} />
        </ConvexProviderWithAuth>
      </SignedIn>
    </ClerkProvider>
  );
}

function useClerkConvexAuth() {
  const { getToken, isLoaded, isSignedIn, orgId, orgRole, sessionClaims } = useAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      const skipCache = forceRefreshToken;

      try {
        if (sessionClaims?.aud === "convex") {
          return await getToken({ skipCache });
        }

        const convexToken = await getToken({ skipCache, template: "convex" });
        if (convexToken) return convexToken;

        return await getToken({ skipCache });
      } catch {
        return null;
      }
    },
    // Clerk's getToken is not memoized, so depending on it can reset Convex auth
    // repeatedly while startup mutations are in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId, orgRole, sessionClaims?.aud],
  );

  return useMemo(
    () => ({
      fetchAccessToken,
      isAuthenticated: isSignedIn ?? false,
      isLoading: !isLoaded,
    }),
    [fetchAccessToken, isLoaded, isSignedIn],
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
