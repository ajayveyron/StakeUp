import { Feather } from "@expo/vector-icons";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
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
const RESEND_COOLDOWN_MS = 30_000;

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

function getEmailCodeFactor(resource: unknown) {
  const factors = (resource as { supportedFirstFactors?: unknown[] })
    ?.supportedFirstFactors;
  if (!Array.isArray(factors)) return null;
  return (
    factors.find(
      (factor) =>
        factor &&
        typeof factor === "object" &&
        (factor as { strategy?: string }).strategy === "email_code"
    ) ?? null
  ) as { emailAddressId?: string } | null;
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
  const [signInEmailAddressId, setSignInEmailAddressId] = useState<
    string | null
  >(null);
  const [lastCodeSentAt, setLastCodeSentAt] = useState<number | null>(null);
  const [clockTick, setClockTick] = useState(Date.now());

  const loaded = signInLoaded && signUpLoaded;
  const normalizedFullName = useMemo(() => fullName.trim(), [fullName]);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const resendCooldownSeconds = useMemo(() => {
    if (!lastCodeSentAt) return 0;
    return Math.max(
      0,
      Math.ceil((RESEND_COOLDOWN_MS - (clockTick - lastCodeSentAt)) / 1000)
    );
  }, [clockTick, lastCodeSentAt]);

  useEffect(() => {
    if (!pendingCode || !lastCodeSentAt || resendCooldownSeconds <= 0) return;
    const interval = setInterval(() => setClockTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lastCodeSentAt, pendingCode, resendCooldownSeconds]);

  function resetCodeState() {
    setPendingCode(false);
    setCode("");
    setSignInEmailAddressId(null);
    setLastCodeSentAt(null);
    setClockTick(Date.now());
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    resetCodeState();
    setError(null);
  }

  async function prepareSignInCode() {
    if (!signIn) throw new Error("Sign-in is not ready. Try again.");
    const created = await signIn.create({ identifier: normalizedEmail });
    const emailCodeFactor = getEmailCodeFactor(created);

    if (emailCodeFactor?.emailAddressId) {
      setSignInEmailAddressId(emailCodeFactor.emailAddressId);
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailCodeFactor.emailAddressId,
      } as any);
      return;
    }

    const explicit = await signIn.create({
      identifier: normalizedEmail,
      strategy: "email_code",
    } as any);
    const explicitFactor = getEmailCodeFactor(explicit);
    const emailAddressId = explicitFactor?.emailAddressId;
    if (emailAddressId) setSignInEmailAddressId(emailAddressId);

    await signIn.prepareFirstFactor({
      strategy: "email_code",
      ...(emailAddressId ? { emailAddressId } : {}),
    } as any);
  }

  async function prepareOrResendSignInCode() {
    if (!signIn) throw new Error("Sign-in is not ready. Try again.");
    if (!pendingCode) {
      await prepareSignInCode();
      return;
    }

    await signIn.prepareFirstFactor({
      strategy: "email_code",
      ...(signInEmailAddressId
        ? { emailAddressId: signInEmailAddressId }
        : {}),
    } as any);
  }

  async function requestCode({ resend = false } = {}) {
    if (!loaded || !normalizedEmail) return;
    if (mode === "signUp" && !normalizedFullName) return;
    if (resend && resendCooldownSeconds > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signUp") {
        if (!pendingCode) {
          const nameParts = splitName(normalizedFullName);
          await signUp.create({
            emailAddress: normalizedEmail,
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            unsafeMetadata: { displayName: normalizedFullName },
          } as any);
        }
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        } as any);
      } else {
        await prepareOrResendSignInCode();
      }
      setPendingCode(true);
      setLastCodeSentAt(Date.now());
      setClockTick(Date.now());
      if (resend) setCode("");
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
                    resetCodeState();
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
                  resetCodeState();
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
            <>
              <View
                style={[
                  styles.notice,
                  { backgroundColor: colors.primary + "12" },
                ]}
              >
                <Feather name="mail" size={15} color={colors.primary} />
                <Text
                  style={[styles.noticeText, { color: colors.foreground }]}
                >
                  Code sent to {normalizedEmail}
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Verification code
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather
                    name="key"
                    size={16}
                    color={colors.mutedForeground}
                  />
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
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  onPress={() => requestCode({ resend: true })}
                  disabled={submitting || resendCooldownSeconds > 0}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.secondaryAction,
                      {
                        color:
                          submitting || resendCooldownSeconds > 0
                            ? colors.mutedForeground
                            : colors.primary,
                      },
                    ]}
                  >
                    {resendCooldownSeconds > 0
                      ? `Resend in ${resendCooldownSeconds}s`
                      : "Resend code"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    resetCodeState();
                    setError(null);
                  }}
                  disabled={submitting}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.secondaryAction,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Change email
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {error && (
            <Text style={[styles.error, { color: colors.danger }]}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            onPress={pendingCode ? verifyCode : () => requestCode()}
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
  notice: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 17,
  },
  secondaryActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  secondaryAction: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
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
