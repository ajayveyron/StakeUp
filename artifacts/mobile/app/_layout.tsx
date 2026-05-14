import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthScreen } from "@/components/AuthScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommitmentsProvider } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="commitment/new"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="commitment/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="admin/reviews" options={{ headerShown: false }} />
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
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.setupTitle, { color: colors.foreground }]}>
        Backend setup required
      </Text>
      <Text style={[styles.setupText, { color: colors.mutedForeground }]}>
        Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY and EXPO_PUBLIC_CONVEX_URL to the
        mobile environment.
      </Text>
    </View>
  );
}

function AuthenticatedApp() {
  const colors = useColors();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    upsertCurrentUser()
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, upsertCurrentUser]);

  if (status === "loading") {
    return <LoadingScreen message="Preparing account" />;
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.setupTitle, { color: colors.foreground }]}>
          Could not prepare your account
        </Text>
        <Text style={[styles.setupText, { color: colors.mutedForeground }]}>
          Check the Convex and Clerk environment values, then try again.
        </Text>
        <TouchableOpacity
          onPress={() => setAttempt((value) => value + 1)}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
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

function AppGate() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <AuthScreen />;
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
          <SetupRequiredScreen />
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
              <AppGate />
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
  retryBtn: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: {
    color: "#000",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
