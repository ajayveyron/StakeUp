import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useReducedMotion } from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthScreen } from "@/components/AuthScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  ACCOUNT_STATUS_SERVICES,
  RavenStatusScreen,
  SESSION_STATUS_SERVICES,
  SETUP_STATUS_SERVICES,
} from "@/components/RavenStatus";
import { CommitmentsProvider } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import { normalizeWhatsAppNumber } from "@/utils/whatsapp";
import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

SplashScreen.preventAutoHideAsync();

const WEB_MAX_WIDTH = 480;

function WebFrame({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  if (Platform.OS !== "web") return <>{children}</>;
  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        alignItems: "center",
        backgroundColor: colors.background,
      }}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: WEB_MAX_WIDTH,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

const queryClient = new QueryClient();
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

function RootLayoutNav() {
  const reduceMotion = useReducedMotion();
  const screenAnimation = reduceMotion
    ? "fade"
    : Platform.OS === "web"
    ? "slide_from_right"
    : "default";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: screenAnimation,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="commitment/new"
        options={{
          animation: reduceMotion ? "fade" : "slide_from_bottom",
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen name="commitment/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
    </Stack>
  );
}

function LoadingScreen({ message = "Loading" }: { message?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
        {message}
      </Text>
    </View>
  );
}

function SetupRequiredScreen() {
  return (
    <RavenStatusScreen
      title="Backend setup required"
      message="The app is missing the keys it needs to reach Clerk and Convex."
      services={SETUP_STATUS_SERVICES}
      contactMessage="Hi, Pact Raven is showing backend setup required. Please check the Clerk and Convex mobile environment values."
    />
  );
}

function AuthenticatedApp() {
  const { user: clerkUser } = useUser();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);
  const syncCurrentUserOAuthImage = useMutation(
    api.users.syncCurrentUserOAuthImage,
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setLastError(null);
    upsertCurrentUser()
      .then(async () => {
        if (clerkUser?.imageUrl) {
          try {
            await syncCurrentUserOAuthImage({ imageUrl: clerkUser.imageUrl });
          } catch (error) {
            console.warn(error);
          }
        }
        if (!cancelled) setStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setLastError(
            error instanceof Error ? error.message : "Unknown account setup error",
          );
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    attempt,
    clerkUser?.imageUrl,
    syncCurrentUserOAuthImage,
    upsertCurrentUser,
  ]);

  if (status === "loading") {
    return <LoadingScreen message="Preparing account" />;
  }

  if (status === "error") {
    return (
      <RavenStatusScreen
        title="The Raven is reconnecting"
        message="Your pact record is safe. Account setup did not finish, so pact actions are paused until the backend responds."
        services={ACCOUNT_STATUS_SERVICES}
        contactMessage={[
          "Hi, Pact Raven could not prepare my account after sign-in.",
          lastError ? `Error: ${lastError}` : undefined,
          "Please check the app status.",
        ]
          .filter(Boolean)
          .join("\n")}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    );
  }

  return <AccountGate />;
}

function AccountGate() {
  const currentUser = useQuery(api.users.current);

  if (!currentUser) return <LoadingScreen message="Loading profile" />;

  if (currentUser.role !== "admin" && !currentUser.whatsappNumber?.trim()) {
    return <WhatsAppOnboardingScreen />;
  }

  return (
    <CommitmentsProvider>
      <GestureHandlerRootView>
        <KeyboardProvider>
          <RootLayoutNav />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </CommitmentsProvider>
  );
}

function WhatsAppOnboardingScreen() {
  const colors = useColors();
  const updateWhatsAppNumber = useMutation(api.users.updateWhatsAppNumber);
  const [whatsappNumber, setWhatsAppNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizeWhatsAppNumber(whatsappNumber);

  async function handleSave() {
    if (!normalized || submitting) {
      setError("Enter a valid WhatsApp mobile number.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await updateWhatsAppNumber({ whatsappNumber: normalized });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the WhatsApp number.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.onboardingPanel,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.setupTitle, { color: colors.foreground }]}>
          Record your WhatsApp number
        </Text>
        <Text style={[styles.setupText, { color: colors.mutedForeground }]}>
          The Raven will use this number for pact reminders, proof nudges, and
          review updates when WhatsApp flows are ready.
        </Text>
        <View style={styles.onboardingField}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
            WhatsApp mobile number
          </Text>
          <TextInput
            value={whatsappNumber}
            onChangeText={(value) => {
              setWhatsAppNumber(value);
              if (error) setError(null);
            }}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            placeholderTextColor={colors.mutedForeground}
            editable={!submitting}
            style={[
              styles.onboardingInput,
              {
                color: colors.foreground,
                backgroundColor: colors.input,
                borderColor: colors.border,
              },
            ]}
          />
          <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
            India numbers can be entered as 10 digits. Country code is stored
            with the record.
          </Text>
          {error && (
            <Text style={[styles.fieldError, { color: colors.danger }]}>
              {error}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={submitting || !normalized}
          style={[
            styles.saveBtn,
            {
              backgroundColor: colors.primary,
              opacity: submitting || !normalized ? 0.5 : 1,
            },
          ]}
          activeOpacity={0.85}
        >
          <Text style={styles.retryText}>
            {submitting ? "Saving…" : "Save WhatsApp number"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AppGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading: convexAuthLoading, isAuthenticated: convexAuthenticated } =
    useConvexAuth();
  const sessionIssue = isSignedIn && (convexAuthLoading || !convexAuthenticated);
  const [sessionWaitExpired, setSessionWaitExpired] = useState(false);

  useEffect(() => {
    if (!sessionIssue) {
      setSessionWaitExpired(false);
      return;
    }

    const id = setTimeout(() => setSessionWaitExpired(true), 9000);
    return () => clearTimeout(id);
  }, [sessionIssue]);

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <AuthScreen />;
  if (sessionIssue && sessionWaitExpired) {
    return (
      <RavenStatusScreen
        title="The Raven is reconnecting"
        message="You are signed in, but the app has not received a confirmed backend session yet."
        services={SESSION_STATUS_SERVICES}
        contactMessage="Hi, Pact Raven is stuck preparing my session after sign-in. Please check Clerk and Convex auth."
      />
    );
  }
  if (sessionIssue) {
    return <LoadingScreen message="Preparing session" />;
  }
  return <AuthenticatedApp />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (!clerkPublishableKey || !convexClient) {
    return (
      <SafeAreaProvider>
        <ErrorBoundary>
          <WebFrame>
            <SetupRequiredScreen />
          </WebFrame>
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ClerkProvider
            publishableKey={clerkPublishableKey}
            tokenCache={tokenCache}
          >
            <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
              <WebFrame>
                <AppGate />
              </WebFrame>
            </ConvexProviderWithClerk>
          </ClerkProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  centerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  setupTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  setupText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
  onboardingPanel: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  onboardingField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  onboardingInput: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  saveBtn: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtn: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
