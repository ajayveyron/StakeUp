import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

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
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <SignedOut>
        <main className="setup-screen">
          <section className="setup-panel">
            <p className="eyebrow">Pact Raven Admin</p>
            <h1>Sign in</h1>
            <SignInButton mode="modal">
              <button className="primary-button" type="button">
                Continue with Clerk
              </button>
            </SignInButton>
          </section>
        </main>
      </SignedOut>
      <SignedIn>
        <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
          <App userButton={<UserButton />} />
        </ConvexProviderWithClerk>
      </SignedIn>
    </ClerkProvider>
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
