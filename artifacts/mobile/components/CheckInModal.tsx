import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Commitment } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  formatCountdown,
  formatCurrency,
  getMsUntilDeadline,
  getRefundPerDay,
} from "@/utils/commitment";

interface Props {
  visible: boolean;
  commitment: Commitment | null;
  date: string;
  onClose: () => void;
  onSubmitContent: (commitmentId: string, date: string, url: string) => void;
  onSubmitSteps: (commitmentId: string, date: string, steps: number) => void;
}

export function CheckInModal({
  visible,
  commitment,
  date,
  onClose,
  onSubmitContent,
  onSubmitSteps,
}: Props) {
  const colors = useColors();
  const [url, setUrl] = useState("");
  const [steps, setSteps] = useState("");
  const [countdown, setCountdown] = useState(getMsUntilDeadline());
  const urlRef = useRef<TextInput>(null);
  const stepsRef = useRef<TextInput>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getMsUntilDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (visible) {
      setUrl("");
      setSteps("");
      setTimeout(() => {
        if (commitment?.goalType === "content") urlRef.current?.focus();
        else stepsRef.current?.focus();
      }, 300);
    }
  }, [visible, commitment?.goalType]);

  if (!commitment) return null;

  const refundPerDay = getRefundPerDay(commitment);
  const isContent = commitment.goalType === "content";
  const stepCount = parseInt(steps) || 0;
  const stepsGoalMet = stepCount >= commitment.targetPerDay;
  const canSubmit = isContent
    ? url.trim().startsWith("http")
    : stepsGoalMet;

  function handleSubmit() {
    if (!canSubmit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isContent) {
      onSubmitContent(commitment!.id, date, url.trim());
    } else {
      onSubmitSteps(commitment!.id, date, stepCount);
    }
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {isContent ? "Submit Proof" : "Submit Steps"}
              </Text>
              <Text style={[styles.commitName, { color: colors.mutedForeground }]} numberOfLines={1}>
                {commitment.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Deadline countdown */}
          <View
            style={[
              styles.deadlineBadge,
              {
                backgroundColor:
                  countdown < 3600000
                    ? colors.danger + "22"
                    : colors.secondary,
                borderColor:
                  countdown < 3600000
                    ? colors.danger + "44"
                    : colors.border,
              },
            ]}
          >
            <Feather
              name="clock"
              size={12}
              color={countdown < 3600000 ? colors.danger : colors.mutedForeground}
            />
            <Text
              style={[
                styles.deadlineText,
                {
                  color:
                    countdown < 3600000
                      ? colors.danger
                      : colors.mutedForeground,
                },
              ]}
            >
              {formatCountdown(countdown)} · Deadline 11:59 PM
            </Text>
          </View>

          {/* Content: URL input */}
          {isContent && (
            <View style={styles.section}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Public post link
              </Text>
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                Paste the link to your published post (Instagram, YouTube, TikTok, etc.)
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Feather name="link" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  ref={urlRef}
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="https://..."
                  placeholderTextColor={colors.mutedForeground}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                {url.length > 0 && (
                  <TouchableOpacity onPress={() => setUrl("")} activeOpacity={0.7}>
                    <Feather name="x-circle" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
              {url.trim().length > 0 && !url.trim().startsWith("http") && (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  Must be a valid URL starting with http
                </Text>
              )}
            </View>
          )}

          {/* Steps: count input */}
          {!isContent && (
            <View style={styles.section}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Steps today
              </Text>
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                Enter your step count. Goal:{" "}
                {commitment.targetPerDay.toLocaleString("en-IN")} steps
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Feather name="activity" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  ref={stepsRef}
                  style={[styles.input, styles.stepsInput, { color: colors.foreground }]}
                  placeholder={`e.g. ${commitment.targetPerDay.toLocaleString("en-IN")}`}
                  placeholderTextColor={colors.mutedForeground}
                  value={steps}
                  onChangeText={(v) => setSteps(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {steps.length > 0 && (
                <View
                  style={[
                    styles.stepsResult,
                    {
                      backgroundColor: stepsGoalMet
                        ? colors.primary + "14"
                        : colors.danger + "14",
                      borderColor: stepsGoalMet
                        ? colors.primary + "33"
                        : colors.danger + "33",
                    },
                  ]}
                >
                  <Feather
                    name={stepsGoalMet ? "check-circle" : "x-circle"}
                    size={14}
                    color={stepsGoalMet ? colors.primary : colors.danger}
                  />
                  <Text
                    style={[
                      styles.stepsResultText,
                      {
                        color: stepsGoalMet ? colors.primary : colors.danger,
                      },
                    ]}
                  >
                    {stepsGoalMet
                      ? `Goal met! +${stepCount - commitment.targetPerDay >= 0 ? (stepCount - commitment.targetPerDay).toLocaleString("en-IN") : 0} extra steps`
                      : `${(commitment.targetPerDay - stepCount).toLocaleString("en-IN")} steps short of goal`}
                  </Text>
                </View>
              )}

              {/* Health App placeholder */}
              <View
                style={[
                  styles.healthBox,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Feather name="smartphone" size={14} color={colors.mutedForeground} />
                <Text style={[styles.healthText, { color: colors.mutedForeground }]}>
                  Auto-sync from Apple Health / Google Fit available in the full app build.
                </Text>
              </View>
            </View>
          )}

          {/* Refund preview */}
          <View
            style={[
              styles.refundPreview,
              { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" },
            ]}
          >
            <Feather name="rotate-ccw" size={14} color={colors.primary} />
            <Text style={[styles.refundText, { color: colors.primary }]}>
              {isContent && canSubmit
                ? `If approved, ${formatCurrency(refundPerDay, commitment.currency)} will be added to your wallet`
                : !isContent && stepsGoalMet
                ? `If approved, ${formatCurrency(refundPerDay, commitment.currency)} will be added to your wallet`
                : !isContent && stepCount > 0 && !stepsGoalMet
                ? `This is below target. You need ${commitment.targetPerDay.toLocaleString("en-IN")} steps to submit.`
                : `Submit by the deadline for manual review`}
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[
              styles.submitBtn,
              {
                backgroundColor: canSubmit ? colors.primary : colors.secondary,
                opacity: canSubmit ? 1 : 0.5,
              },
            ]}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.submitText,
                { color: canSubmit ? "#000" : colors.mutedForeground },
              ]}
            >
              Submit for Review
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  commitName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  deadlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  section: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: -4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  stepsInput: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  errorText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  stepsResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  stepsResultText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  healthBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  healthText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 16,
  },
  refundPreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  refundText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 18,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
