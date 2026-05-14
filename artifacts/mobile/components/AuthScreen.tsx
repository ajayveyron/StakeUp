import { Feather } from "@expo/vector-icons";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type AuthMode = "signIn" | "signUp";

function errorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown[] }).errors)
  ) {
    const first = (
      error as { errors: { longMessage?: string; message?: string }[] }
    ).errors[0];
    return first?.longMessage ?? first?.message ?? "Something went wrong";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

export function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pendingCode, setPendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loaded = signInLoaded && signUpLoaded;
  const normalizedFullName = useMemo(() => fullName.trim(), [fullName]);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPendingCode(false);
    setCode("");
    setError(null);
  }

  async function requestCode() {
    if (!loaded || !normalizedEmail) return;
    if (mode === "signUp" && !normalizedFullName) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signUp") {
        const nameParts = splitName(normalizedFullName);
        await signUp.create({
          emailAddress: normalizedEmail,
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          unsafeMetadata: { displayName: normalizedFullName },
        } as any);
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        } as any);
      } else {
        await signIn.create({
          identifier: normalizedEmail,
          strategy: "email_code",
        } as any);
      }
      setPendingCode(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode() {
    if (!loaded || !code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result =
        mode === "signUp"
          ? await signUp.attemptEmailAddressVerification({
              code: code.trim(),
            } as any)
          : await signIn.attemptFirstFactor({
              strategy: "email_code",
              code: code.trim(),
            } as any);

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        return;
      }

      setError("Verification needs another step. Try again.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const topPadding = Platform.OS === "web" ? 72 : insets.top + 24;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.content, { paddingTop: topPadding }]}>
        <View style={styles.brandBlock}>
          <LinearGradient
            colors={["#00C853", "#00E676"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <Feather name="target" size={28} color="#000" />
          </LinearGradient>
          <Text style={[styles.brand, { color: colors.foreground }]}>
            Pact Raven
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sign in to manage your pacts and review history.
          </Text>
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.segment, { backgroundColor: colors.secondary }]}>
            <TouchableOpacity
              onPress={() => switchMode("signIn")}
              style={[
                styles.segmentBtn,
                mode === "signIn" && { backgroundColor: colors.background },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      mode === "signIn"
                        ? colors.foreground
                        : colors.mutedForeground,
                  },
                ]}
              >
                Sign in
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchMode("signUp")}
              style={[
                styles.segmentBtn,
                mode === "signUp" && { backgroundColor: colors.background },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      mode === "signUp"
                        ? colors.foreground
                        : colors.mutedForeground,
                  },
                ]}
              >
                Sign up
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "signUp" && !pendingCode && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Full name
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Feather name="user" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={fullName}
                  onChangeText={(value) => {
                    setFullName(value);
                    setPendingCode(false);
                    setCode("");
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder="Ajay Pawriya"
                  placeholderTextColor={colors.mutedForeground}
                  editable={!submitting}
                />
              </View>
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Email
            </Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <Feather name="mail" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setPendingCode(false);
                  setCode("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                editable={!submitting}
              />
            </View>
          </View>

          {pendingCode && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Verification code
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Feather name="key" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={code}
                  onChangeText={(value) =>
                    setCode(value.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  placeholder="123456"
                  placeholderTextColor={colors.mutedForeground}
                  editable={!submitting}
                />
              </View>
            </View>
          )}

          {error && (
            <Text style={[styles.error, { color: colors.danger }]}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            onPress={pendingCode ? verifyCode : requestCode}
            disabled={
              submitting ||
              !loaded ||
              !normalizedEmail ||
              (mode === "signUp" && !normalizedFullName) ||
              (pendingCode && code.trim().length < 4)
            }
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#00C853", "#00E676"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.primaryBtn,
                {
                  opacity:
                    submitting ||
                    !loaded ||
                    !normalizedEmail ||
                    (mode === "signUp" && !normalizedFullName) ||
                    (pendingCode && code.trim().length < 4)
                      ? 0.5
                      : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryText}>
                  {pendingCode ? "Verify code" : "Send code"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 28,
  },
  brandBlock: { alignItems: "center", gap: 10 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 30, fontFamily: "Inter_700Bold" },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 16,
  },
  segment: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  field: { gap: 8 },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  error: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#000",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
