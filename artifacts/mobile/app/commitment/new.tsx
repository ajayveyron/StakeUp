import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoalType, useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  addDays,
  formatCurrency,
  getTodayStr,
  goalTypeDefaultUnit,
  goalTypeLabel,
} from "@/utils/commitment";

const GOAL_TYPES: GoalType[] = [
  "content",
  "steps",
  "exercise",
  "reading",
  "custom",
];

const GOAL_ICONS: Record<GoalType, string> = {
  content: "video",
  steps: "activity",
  exercise: "zap",
  reading: "book-open",
  custom: "target",
};

const DURATION_OPTIONS = [
  { label: "1 Week", days: 7 },
  { label: "2 Weeks", days: 14 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
];

const CURRENCY_OPTIONS = ["INR", "USD"];

type Step = 0 | 1 | 2 | 3;

interface FormData {
  name: string;
  goalType: GoalType;
  goalUnit: string;
  targetCount: string;
  durationDays: number;
  stakeAmount: string;
  currency: string;
  friendName: string;
  friendContact: string;
}

export default function NewCommitmentScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addCommitment } = useCommitments();

  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormData>({
    name: "",
    goalType: "content",
    goalUnit: "posts",
    targetCount: "30",
    durationDays: 30,
    stakeAmount: "1000",
    currency: "INR",
    friendName: "",
    friendContact: "",
  });

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectGoalType(type: GoalType) {
    update("goalType", type);
    update("goalUnit", goalTypeDefaultUnit(type));
  }

  function canNext(): boolean {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return parseInt(form.targetCount) > 0;
    if (step === 2) return parseFloat(form.stakeAmount) > 0;
    return true;
  }

  function handleNext() {
    if (!canNext()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 3) {
      setStep((prev) => (prev + 1) as Step);
    } else {
      handleCreate();
    }
  }

  function handleBack() {
    if (step === 0) {
      router.back();
    } else {
      setStep((prev) => (prev - 1) as Step);
    }
  }

  function handleCreate() {
    const today = getTodayStr();
    addCommitment({
      name: form.name.trim(),
      goalType: form.goalType,
      goalUnit: form.goalUnit.trim() || goalTypeDefaultUnit(form.goalType),
      targetCount: parseInt(form.targetCount) || 1,
      stakeAmount: parseFloat(form.stakeAmount) || 0,
      currency: form.currency,
      startDate: today,
      endDate: addDays(today, form.durationDays - 1),
      friendName: form.friendName.trim() || undefined,
      friendContact: form.friendContact.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  }

  const perCheckIn =
    parseFloat(form.stakeAmount) / (parseInt(form.targetCount) || 1);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const STEPS = ["Goal", "Target", "Stake", "Review"];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: topPadding + 8,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            New Stake
          </Text>
          <View style={styles.backBtn} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepsRow}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      i < step
                        ? colors.primary
                        : i === step
                        ? colors.primary
                        : colors.border,
                    opacity: i > step ? 0.4 : 1,
                  },
                ]}
              >
                {i < step ? (
                  <Feather name="check" size={10} color="#000" />
                ) : (
                  <Text style={styles.stepNum}>{i + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: i === step ? colors.foreground : colors.mutedForeground,
                    fontFamily:
                      i === step ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {s}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step 0: Goal */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                What's your commitment?
              </Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Name your goal and choose a category.
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="e.g. Post 30 reels this month"
                placeholderTextColor={colors.mutedForeground}
                value={form.name}
                onChangeText={(v) => update("name", v)}
                maxLength={80}
                returnKeyType="next"
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Category
              </Text>
              <View style={styles.goalTypeGrid}>
                {GOAL_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => selectGoalType(t)}
                    activeOpacity={0.75}
                    style={[
                      styles.goalTypeBtn,
                      {
                        backgroundColor:
                          form.goalType === t
                            ? colors.primary + "22"
                            : colors.card,
                        borderColor:
                          form.goalType === t ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Feather
                      name={GOAL_ICONS[t] as any}
                      size={18}
                      color={
                        form.goalType === t
                          ? colors.primary
                          : colors.mutedForeground
                      }
                    />
                    <Text
                      style={[
                        styles.goalTypeText,
                        {
                          color:
                            form.goalType === t
                              ? colors.primary
                              : colors.mutedForeground,
                        },
                      ]}
                    >
                      {goalTypeLabel(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                What's the unit?
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="e.g. reels, sessions, pages"
                placeholderTextColor={colors.mutedForeground}
                value={form.goalUnit}
                onChangeText={(v) => update("goalUnit", v)}
                maxLength={30}
              />
            </View>
          )}

          {/* Step 1: Target */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Set your target
              </Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                How many {form.goalUnit} do you want to complete?
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Target count
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.bigInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="30"
                placeholderTextColor={colors.mutedForeground}
                value={form.targetCount}
                onChangeText={(v) => update("targetCount", v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                returnKeyType="done"
              />
              <Text style={[styles.inputHint, { color: colors.mutedForeground }]}>
                {form.targetCount || "0"} {form.goalUnit} total
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Duration
              </Text>
              <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d.days}
                    onPress={() => update("durationDays", d.days)}
                    activeOpacity={0.75}
                    style={[
                      styles.durationBtn,
                      {
                        backgroundColor:
                          form.durationDays === d.days
                            ? colors.primary + "22"
                            : colors.card,
                        borderColor:
                          form.durationDays === d.days
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        {
                          color:
                            form.durationDays === d.days
                              ? colors.primary
                              : colors.mutedForeground,
                          fontFamily:
                            form.durationDays === d.days
                              ? "Inter_600SemiBold"
                              : "Inter_400Regular",
                        },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 2: Stake */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Put your money down
              </Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                You'll earn it back every time you check in.
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Currency
              </Text>
              <View style={styles.currencyRow}>
                {CURRENCY_OPTIONS.map((cur) => (
                  <TouchableOpacity
                    key={cur}
                    onPress={() => update("currency", cur)}
                    activeOpacity={0.75}
                    style={[
                      styles.currencyBtn,
                      {
                        backgroundColor:
                          form.currency === cur
                            ? colors.primary + "22"
                            : colors.card,
                        borderColor:
                          form.currency === cur ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.currencyText,
                        {
                          color:
                            form.currency === cur
                              ? colors.primary
                              : colors.mutedForeground,
                        },
                      ]}
                    >
                      {cur === "INR" ? "₹ INR" : "$ USD"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Stake amount
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.bigInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="1000"
                placeholderTextColor={colors.mutedForeground}
                value={form.stakeAmount}
                onChangeText={(v) => update("stakeAmount", v.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              {parseInt(form.targetCount) > 0 && parseFloat(form.stakeAmount) > 0 && (
                <View
                  style={[
                    styles.earningsPreview,
                    { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" },
                  ]}
                >
                  <Feather name="trending-up" size={16} color={colors.primary} />
                  <Text style={[styles.earningsText, { color: colors.primary }]}>
                    {formatCurrency(perCheckIn, form.currency)} earned per {form.goalUnit}
                  </Text>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Forfeit to a friend (optional)
              </Text>
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                Missed stakes can go to a friend instead of vanishing.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="Friend's name"
                placeholderTextColor={colors.mutedForeground}
                value={form.friendName}
                onChangeText={(v) => update("friendName", v)}
                maxLength={60}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="Contact (phone or UPI)"
                placeholderTextColor={colors.mutedForeground}
                value={form.friendContact}
                onChangeText={(v) => update("friendContact", v)}
                maxLength={80}
                keyboardType="phone-pad"
              />
            </View>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Review your stake
              </Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Make sure everything looks right.
              </Text>

              <View
                style={[
                  styles.reviewCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <ReviewRow label="Commitment" value={form.name} colors={colors} />
                <ReviewRow
                  label="Goal"
                  value={`${form.targetCount} ${form.goalUnit}`}
                  colors={colors}
                />
                <ReviewRow
                  label="Duration"
                  value={
                    DURATION_OPTIONS.find((d) => d.days === form.durationDays)
                      ?.label ?? `${form.durationDays} days`
                  }
                  colors={colors}
                />
                <ReviewRow
                  label="Stake"
                  value={formatCurrency(parseFloat(form.stakeAmount) || 0, form.currency)}
                  colors={colors}
                  valueColor={colors.accent}
                />
                <ReviewRow
                  label="Per check-in"
                  value={formatCurrency(perCheckIn, form.currency)}
                  colors={colors}
                  valueColor={colors.primary}
                />
                {form.friendName && (
                  <ReviewRow
                    label="Forfeit to"
                    value={`${form.friendName}${form.friendContact ? ` · ${form.friendContact}` : ""}`}
                    colors={colors}
                  />
                )}
              </View>

              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: colors.accent + "14", borderColor: colors.accent + "33" },
                ]}
              >
                <Feather name="info" size={14} color={colors.accent} />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  Check in each day you complete your goal to earn back{" "}
                  <Text style={{ color: colors.primary }}>
                    {formatCurrency(perCheckIn, form.currency)}
                  </Text>
                  . Miss a day and that amount stays at risk.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Action */}
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleNext}
            disabled={!canNext()}
            style={[
              styles.nextBtn,
              {
                backgroundColor: canNext() ? colors.primary : colors.secondary,
                opacity: canNext() ? 1 : 0.5,
              },
            ]}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.nextBtnText,
                { color: canNext() ? "#000" : colors.mutedForeground },
              ]}
            >
              {step === 3 ? "Start Stake" : "Continue"}
            </Text>
            <Feather
              name={step === 3 ? "check" : "arrow-right"}
              size={18}
              color={canNext() ? "#000" : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ReviewRow({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  colors: any;
  valueColor?: string;
}) {
  return (
    <View style={reviewStyles.row}>
      <Text style={[reviewStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text
        style={[reviewStyles.value, { color: valueColor ?? colors.foreground }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
    flex: 1,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  stepsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 0,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: {
    fontSize: 11,
    color: "#000",
    fontFamily: "Inter_600SemiBold",
  },
  stepLabel: {
    fontSize: 10,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  stepContent: {
    gap: 12,
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  stepSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  bigInput: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    paddingVertical: 16,
    textAlign: "center",
  },
  inputHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: -4,
  },
  goalTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalTypeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: "45%",
  },
  goalTypeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  durationText: {
    fontSize: 13,
  },
  currencyRow: {
    flexDirection: "row",
    gap: 10,
  },
  currencyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  currencyText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  earningsPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: -4,
  },
  earningsText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  reviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 0,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  nextBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
