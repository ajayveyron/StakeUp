import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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

import {
  Commitment,
  ForfeitDestination,
  GoalType,
  useCommitments,
} from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  DurationType,
  daysBetween,
  formatCurrency,
  formatDate,
  formatDaysOfWeek,
  formatStartDateOption,
  getDayName,
  getDurationLabel,
  getEndDateForDuration,
  getScheduledDates,
  getStakePresets,
  getStartDateOptions,
  getTodayStr,
} from "@/utils/commitment";

const DURATION_OPTIONS: { label: string; type: DurationType }[] = [
  { label: "1 Week", type: "week" },
  { label: "2 Weeks", type: "2weeks" },
  { label: "1 Month", type: "month" },
  { label: "3 Months", type: "3months" },
];

const STEP_PRESETS = [5000, 7500, 10000, 15000];
const CURRENCY_OPTIONS = ["INR", "USD"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

type FormStep = 0 | 1 | 2 | 3;

interface FormData {
  name: string;
  goalType: GoalType;
  startDate: string;
  daysOfWeek: number[];
  durationType: DurationType;
  targetPerDay: number;
  customSteps: string;
  stakeAmount: string;
  currency: string;
  forfeitDestination: ForfeitDestination;
  friendName: string;
  friendContact: string;
}

export default function NewCommitmentScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addCommitment } = useCommitments();
  const dateScrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<FormStep>(0);
  const [form, setForm] = useState<FormData>({
    name: "",
    goalType: "content",
    startDate: getTodayStr(),
    daysOfWeek: [1, 2, 3, 4, 5],
    durationType: "month",
    targetPerDay: 1,
    customSteps: "",
    stakeAmount: "1000",
    currency: "INR",
    forfeitDestination: "reward_pool",
    friendName: "",
    friendContact: "",
  });

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(day: number) {
    const has = form.daysOfWeek.includes(day);
    if (has && form.daysOfWeek.length === 1) return;
    update(
      "daysOfWeek",
      has
        ? form.daysOfWeek.filter((d) => d !== day)
        : [...form.daysOfWeek, day].sort((a, b) => a - b)
    );
  }

  const endDate = getEndDateForDuration(form.startDate, form.durationType);

  const mockCommitment = {
    daysOfWeek: form.daysOfWeek,
    durationDays: daysBetween(form.startDate, endDate),
    startDate: form.startDate,
    endDate,
    stakeAmount: parseFloat(form.stakeAmount) || 0,
    currency: form.currency,
    checkIns: [],
  } as unknown as Commitment;

  const scheduledDates = getScheduledDates(mockCommitment);
  const scheduledDays = scheduledDates.length;
  const perDay =
    scheduledDays > 0 ? (parseFloat(form.stakeAmount) || 0) / scheduledDays : 0;
  const firstSubmissionDate = scheduledDates[0] ?? null;
  const stepGoalFinal = form.customSteps.trim()
    ? parseInt(form.customSteps) || 0
    : form.targetPerDay;
  const forfeitTarget =
    form.forfeitDestination === "friend" && form.friendName.trim()
      ? `to ${form.friendName.trim()}`
      : "to the reward pool";

  function canNext(): boolean {
    if (step === 0)
      return form.name.trim().length > 0 && form.startDate.length > 0;
    if (step === 1) {
      if (form.goalType === "steps") {
        return stepGoalFinal > 0;
      }
      return form.targetPerDay > 0 && form.daysOfWeek.length > 0;
    }
    if (step === 2) {
      if (parseFloat(form.stakeAmount) <= 0) return false;
      if (form.forfeitDestination === "friend") {
        return (
          form.friendName.trim().length > 0 &&
          form.friendContact.trim().length > 0
        );
      }
      return true;
    }
    return true;
  }

  function handleNext() {
    if (!canNext()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 3) {
      setStep((s) => (s + 1) as FormStep);
    } else {
      handleCreate();
    }
  }

  function handleBack() {
    if (step === 0) router.back();
    else setStep((s) => (s - 1) as FormStep);
  }

  function handleCreate() {
    addCommitment({
      name: form.name.trim(),
      goalType: form.goalType,
      daysOfWeek: form.daysOfWeek,
      targetPerDay:
        form.goalType === "steps" ? stepGoalFinal : form.targetPerDay,
      durationDays: daysBetween(form.startDate, endDate),
      stakeAmount: parseFloat(form.stakeAmount) || 0,
      currency: form.currency,
      forfeitDestination: form.forfeitDestination,
      startDate: form.startDate,
      endDate,
      friendName:
        form.forfeitDestination === "friend"
          ? form.friendName.trim()
          : undefined,
      friendContact:
        form.forfeitDestination === "friend"
          ? form.friendContact.trim()
          : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const STEP_LABELS = ["Goal", "Schedule", "Stake", "Review"];
  const startDateOptions = getStartDateOptions(30);

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
            { paddingTop: topPadding + 8, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={styles.headerBtn}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            New Stake
          </Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepsRow}>
          {STEP_LABELS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              {i <= step ? (
                <LinearGradient
                  colors={["#00C853", "#00E676"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stepDot}
                >
                  {i < step ? (
                    <Feather name="check" size={10} color="#000" />
                  ) : (
                    <Text style={styles.stepNum}>{i + 1}</Text>
                  )}
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.stepDot,
                    { backgroundColor: colors.border, opacity: 0.35 },
                  ]}
                >
                  <Text style={styles.stepNum}>{i + 1}</Text>
                </View>
              )}
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color:
                      i === step ? colors.foreground : colors.mutedForeground,
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
          {/* ── STEP 0: Goal type + Name + Start date ── */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                What are you committing to?
              </Text>

              {/* Goal type cards — side by side */}
              <View style={styles.goalTypeRow}>
                {(
                  [
                    {
                      type: "content" as const,
                      icon: "video",
                      title: "Content Creation",
                      proof: "Paste public post URL by 11:59 PM",
                      defaultTarget: 1,
                    },
                    {
                      type: "steps" as const,
                      icon: "activity",
                      title: "Step Count",
                      proof: "Log steps by 11:59 PM, must hit goal",
                      defaultTarget: 10000,
                    },
                  ] as const
                ).map((opt) => {
                  const sel = form.goalType === opt.type;
                  return (
                    <TouchableOpacity
                      key={opt.type}
                      onPress={() => {
                        update("goalType", opt.type);
                        update("targetPerDay", opt.defaultTarget);
                      }}
                      activeOpacity={0.8}
                      style={[
                        styles.goalCard,
                        {
                          backgroundColor: sel
                            ? colors.primary + "18"
                            : colors.card,
                          borderColor: sel ? colors.primary : colors.border,
                          borderWidth: sel ? 2 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.goalCardIcon,
                          {
                            backgroundColor: sel
                              ? colors.primary + "22"
                              : colors.secondary,
                          },
                        ]}
                      >
                        <Feather
                          name={opt.icon as any}
                          size={20}
                          color={sel ? colors.primary : colors.mutedForeground}
                        />
                      </View>
                      <Text
                        style={[
                          styles.goalCardTitle,
                          { color: sel ? colors.primary : colors.foreground },
                        ]}
                      >
                        {opt.title}
                      </Text>
                      <Text
                        style={[
                          styles.goalCardProof,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {opt.proof}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Name */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Commitment name
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
                placeholder={
                  form.goalType === "content"
                    ? "e.g. Post reels every weekday in June"
                    : "e.g. Walk 10k steps every day"
                }
                placeholderTextColor={colors.mutedForeground}
                value={form.name}
                onChangeText={(v) => update("name", v)}
                maxLength={80}
                returnKeyType="done"
              />

              {/* Start date */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Start date
              </Text>
              <ScrollView
                ref={dateScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.datePillsRow}
              >
                {startDateOptions.map((dateStr) => {
                  const selected = form.startDate === dateStr;
                  const opt = formatStartDateOption(dateStr);
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      onPress={() => update("startDate", dateStr)}
                      activeOpacity={0.8}
                      style={[
                        styles.datePill,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.card,
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.datePillTop,
                          {
                            color: selected ? "#000" : colors.mutedForeground,
                          },
                        ]}
                      >
                        {opt.line1}
                      </Text>
                      <Text
                        style={[
                          styles.datePillBottom,
                          { color: selected ? "#000" : colors.foreground },
                        ]}
                      >
                        {opt.line2}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── STEP 1: Schedule ── */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Set your schedule
              </Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Pick which days and how long your challenge runs.
              </Text>

              {/* Days of week */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Active days
              </Text>
              <View style={styles.daysRow}>
                {ALL_DAYS.map((d) => {
                  const sel = form.daysOfWeek.includes(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => toggleDay(d)}
                      activeOpacity={0.8}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: sel ? colors.primary : colors.card,
                          borderColor: sel ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          { color: sel ? "#000" : colors.mutedForeground },
                        ]}
                      >
                        {getDayName(d)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Duration */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Challenge duration
              </Text>
              <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map((opt) => {
                  const sel = form.durationType === opt.type;
                  const previewEnd = getEndDateForDuration(
                    form.startDate,
                    opt.type
                  );
                  const actualDays = daysBetween(form.startDate, previewEnd);
                  return (
                    <TouchableOpacity
                      key={opt.type}
                      onPress={() => update("durationType", opt.type)}
                      activeOpacity={0.8}
                      style={[
                        styles.durationBtn,
                        {
                          backgroundColor: sel
                            ? colors.primary + "22"
                            : colors.card,
                          borderColor: sel ? colors.primary : colors.border,
                          borderWidth: sel ? 2 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.durationLabel,
                          {
                            color: sel ? colors.primary : colors.foreground,
                            fontFamily: sel
                              ? "Inter_600SemiBold"
                              : "Inter_500Medium",
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.durationSub,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {actualDays} days
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Daily target */}
              {form.goalType === "content" && (
                <>
                  <Text
                    style={[styles.fieldLabel, { color: colors.mutedForeground }]}
                  >
                    Posts per active day
                  </Text>
                  <View style={styles.countRow}>
                    {[1, 2, 3].map((n) => (
                      <TouchableOpacity
                        key={n}
                        onPress={() => update("targetPerDay", n)}
                        activeOpacity={0.8}
                        style={[
                          styles.countBtn,
                          {
                            backgroundColor:
                              form.targetPerDay === n
                                ? colors.primary + "22"
                                : colors.card,
                            borderColor:
                              form.targetPerDay === n
                                ? colors.primary
                                : colors.border,
                            borderWidth: form.targetPerDay === n ? 2 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.countBtnText,
                            {
                              color:
                                form.targetPerDay === n
                                  ? colors.primary
                                  : colors.mutedForeground,
                            },
                          ]}
                        >
                          {n} {n === 1 ? "post" : "posts"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {form.goalType === "steps" && (
                <>
                  <Text
                    style={[styles.fieldLabel, { color: colors.mutedForeground }]}
                  >
                    Daily step goal
                  </Text>
                  <View style={styles.stepPresetsGrid}>
                    {STEP_PRESETS.map((n) => {
                      const sel =
                        form.targetPerDay === n && !form.customSteps.trim();
                      return (
                        <TouchableOpacity
                          key={n}
                          onPress={() => {
                            update("targetPerDay", n);
                            update("customSteps", "");
                          }}
                          activeOpacity={0.8}
                          style={[
                            styles.stepPresetBtn,
                            {
                              backgroundColor: sel
                                ? colors.primary + "22"
                                : colors.card,
                              borderColor: sel ? colors.primary : colors.border,
                              borderWidth: sel ? 2 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.stepPresetText,
                              {
                                color: sel
                                  ? colors.primary
                                  : colors.mutedForeground,
                              },
                            ]}
                          >
                            {n.toLocaleString("en-IN")}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.card,
                        borderColor: form.customSteps.trim()
                          ? colors.primary
                          : colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="Or enter a custom step count"
                    placeholderTextColor={colors.mutedForeground}
                    value={form.customSteps}
                    onChangeText={(v) =>
                      update("customSteps", v.replace(/[^0-9]/g, ""))
                    }
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </>
              )}

              {/* Schedule summary */}
              {form.daysOfWeek.length > 0 && (
                <View
                  style={[
                    styles.scheduleSummary,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.scheduleSummaryRow}>
                    <Feather
                      name="calendar"
                      size={14}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.scheduleSummaryLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Starts
                    </Text>
                    <Text
                      style={[
                        styles.scheduleSummaryVal,
                        { color: colors.foreground },
                      ]}
                    >
                      {formatDate(form.startDate)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.scheduleSummaryDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.scheduleSummaryRow}>
                    <Feather
                      name="flag"
                      size={14}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.scheduleSummaryLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Ends
                    </Text>
                    <Text
                      style={[
                        styles.scheduleSummaryVal,
                        { color: colors.foreground },
                      ]}
                    >
                      {formatDate(endDate)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.scheduleSummaryDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.scheduleSummaryRow}>
                    <Feather
                      name="check-square"
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.scheduleSummaryLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Committed days
                    </Text>
                    <Text
                      style={[
                        styles.scheduleSummaryVal,
                        { color: colors.primary },
                      ]}
                    >
                      {scheduledDays} days ({formatDaysOfWeek(form.daysOfWeek)})
                    </Text>
                  </View>
                  {firstSubmissionDate && (
                    <>
                      <View
                        style={[
                          styles.scheduleSummaryDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View style={styles.scheduleSummaryRow}>
                        <Feather
                          name="clock"
                          size={14}
                          color={colors.accent}
                        />
                        <Text
                          style={[
                            styles.scheduleSummaryLabel,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          First submission
                        </Text>
                        <Text
                          style={[
                            styles.scheduleSummaryVal,
                            { color: colors.accent },
                          ]}
                        >
                          {formatDate(firstSubmissionDate)} by 11:59 PM
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ── STEP 2: Stake ── */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Put your money down
              </Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Approved days go to your StakeUp wallet. Missed or rejected days are forfeited.
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Currency
              </Text>
              <View style={styles.currencyRow}>
                {CURRENCY_OPTIONS.map((cur) => (
                  <TouchableOpacity
                    key={cur}
                    onPress={() => update("currency", cur)}
                    activeOpacity={0.8}
                    style={[
                      styles.currencyBtn,
                      {
                        backgroundColor:
                          form.currency === cur
                            ? colors.primary + "22"
                            : colors.card,
                        borderColor:
                          form.currency === cur ? colors.primary : colors.border,
                        borderWidth: form.currency === cur ? 2 : 1,
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
                Total stake amount
              </Text>
              {/* Dynamic presets: each gives a per-day refund that's a multiple of ₹50 / $0.50 */}
              {scheduledDays > 0 && (
                <View style={styles.presetRow}>
                  {getStakePresets(scheduledDays, form.currency).map((preset) => {
                    const perDayPreset = preset / scheduledDays;
                    const sel =
                      parseFloat(form.stakeAmount) === preset &&
                      !form.stakeAmount.includes(".");
                    return (
                      <TouchableOpacity
                        key={preset}
                        onPress={() => update("stakeAmount", String(preset))}
                        activeOpacity={0.8}
                        style={[
                          styles.presetBtn,
                          {
                            backgroundColor: sel
                              ? colors.primary + "22"
                              : colors.card,
                            borderColor: sel ? colors.primary : colors.border,
                            borderWidth: sel ? 2 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetAmount,
                            { color: sel ? colors.primary : colors.foreground },
                          ]}
                        >
                          {formatCurrency(preset, form.currency)}
                        </Text>
                        <Text
                          style={[
                            styles.presetPerDay,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {formatCurrency(perDayPreset, form.currency)}/day
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
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
                placeholder={form.currency === "INR" ? "e.g. 3000" : "e.g. 50"}
                placeholderTextColor={colors.mutedForeground}
                value={form.stakeAmount}
                onChangeText={(v) =>
                  update("stakeAmount", v.replace(/[^0-9.]/g, ""))
                }
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              {scheduledDays > 0 && parseFloat(form.stakeAmount) > 0 && (
                <View
                  style={[
                    styles.refundChip,
                    {
                      backgroundColor: colors.primary + "14",
                      borderColor: colors.primary + "33",
                    },
                  ]}
                >
                  <Feather name="rotate-ccw" size={15} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.refundChipMain,
                        { color: colors.primary },
                      ]}
                    >
                      {formatCurrency(perDay, form.currency)} per day if approved
                    </Text>
                    <Text
                      style={[
                        styles.refundChipSub,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {formatCurrency(parseFloat(form.stakeAmount), form.currency)}{" "}
                      ÷ {scheduledDays} committed days
                    </Text>
                  </View>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                If a day is forfeited
              </Text>
              <View style={styles.forfeitGrid}>
                {(
                  [
                    {
                      value: "reward_pool" as const,
                      icon: "award",
                      title: "Reward pool",
                      body:
                        "Funds rewards for consistent users and keeps StakeUp running.",
                    },
                    {
                      value: "friend" as const,
                      icon: "user",
                      title: "Friend wallet",
                      body:
                        "Goes to a friend's StakeUp wallet. No reward-pool eligibility.",
                    },
                  ] as const
                ).map((opt) => {
                  const selected = form.forfeitDestination === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => update("forfeitDestination", opt.value)}
                      activeOpacity={0.8}
                      style={[
                        styles.forfeitOption,
                        {
                          backgroundColor: selected
                            ? colors.primary + "18"
                            : colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                          borderWidth: selected ? 2 : 1,
                        },
                      ]}
                    >
                      <Feather
                        name={opt.icon as any}
                        size={17}
                        color={selected ? colors.primary : colors.mutedForeground}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.forfeitTitle,
                            {
                              color: selected
                                ? colors.primary
                                : colors.foreground,
                            },
                          ]}
                        >
                          {opt.title}
                        </Text>
                        <Text
                          style={[
                            styles.forfeitBody,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {opt.body}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {form.forfeitDestination === "friend" && (
                <>
                  <Text
                    style={[styles.fieldLabel, { color: colors.mutedForeground }]}
                  >
                    Friend beneficiary
                  </Text>
                  <Text
                    style={[styles.fieldHint, { color: colors.mutedForeground }]}
                  >
                    They will need to sign up to receive forfeits in their wallet.
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
                    placeholder="Phone number or UPI ID"
                    placeholderTextColor={colors.mutedForeground}
                    value={form.friendContact}
                    onChangeText={(v) => update("friendContact", v)}
                    maxLength={80}
                    keyboardType="phone-pad"
                  />
                </>
              )}
            </View>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Review your stake
              </Text>

              {/* Date range banner */}
              <View
                style={[
                  styles.dateBanner,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.dateBannerSide}>
                  <Text
                    style={[
                      styles.dateBannerLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Starts
                  </Text>
                  <Text
                    style={[
                      styles.dateBannerDate,
                      { color: colors.foreground },
                    ]}
                  >
                    {formatDate(form.startDate)}
                  </Text>
                </View>
                <Feather
                  name="arrow-right"
                  size={16}
                  color={colors.mutedForeground}
                />
                <View style={styles.dateBannerSide}>
                  <Text
                    style={[
                      styles.dateBannerLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Ends
                  </Text>
                  <Text
                    style={[
                      styles.dateBannerDate,
                      { color: colors.foreground },
                    ]}
                  >
                    {formatDate(endDate)}
                  </Text>
                </View>
              </View>

              {/* Review rows */}
              <View
                style={[
                  styles.reviewCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <RRow label="Commitment" value={form.name} colors={colors} />
                <RDiv colors={colors} />
                <RRow
                  label="Type"
                  value={
                    form.goalType === "content"
                      ? "Content Creation"
                      : "Step Count"
                  }
                  colors={colors}
                />
                <RDiv colors={colors} />
                <RRow
                  label="Schedule"
                  value={formatDaysOfWeek(form.daysOfWeek)}
                  colors={colors}
                />
                <RDiv colors={colors} />
                <RRow
                  label="Duration"
                  value={`${getDurationLabel(form.durationType)} (${daysBetween(form.startDate, endDate)} calendar days)`}
                  colors={colors}
                />
                <RDiv colors={colors} />
                <RRow
                  label="Committed days"
                  value={`${scheduledDays} days`}
                  colors={colors}
                />
                <RDiv colors={colors} />
                {form.goalType === "steps" ? (
                  <>
                    <RRow
                      label="Daily step goal"
                      value={`${stepGoalFinal.toLocaleString("en-IN")} steps`}
                      colors={colors}
                    />
                    <RDiv colors={colors} />
                  </>
                ) : (
                  <>
                    <RRow
                      label="Posts per day"
                      value={`${form.targetPerDay} post${form.targetPerDay > 1 ? "s" : ""}`}
                      colors={colors}
                    />
                    <RDiv colors={colors} />
                  </>
                )}
                <RRow
                  label="Total staked"
                  value={formatCurrency(
                    parseFloat(form.stakeAmount) || 0,
                    form.currency
                  )}
                  colors={colors}
                  valueColor={colors.accent}
                />
                <RDiv colors={colors} />
                <RRow
                  label="Refund per day"
                  value={formatCurrency(perDay, form.currency)}
                  colors={colors}
                  valueColor={colors.primary}
                />
                <RDiv colors={colors} />
                <RRow
                  label="Forfeit destination"
                  value={
                    form.forfeitDestination === "friend"
                      ? `${form.friendName}${form.friendContact ? ` · ${form.friendContact}` : ""}`
                      : "Reward pool"
                  }
                  colors={colors}
                />
              </View>

              {/* First submission callout */}
              {firstSubmissionDate && (
                <View
                  style={[
                    styles.firstSubmitBox,
                    {
                      backgroundColor: colors.accent + "14",
                      borderColor: colors.accent + "55",
                    },
                  ]}
                >
                  <Feather name="clock" size={16} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.firstSubmitTitle,
                        { color: colors.accent },
                      ]}
                    >
                      First submission due
                    </Text>
                    <Text
                      style={[
                        styles.firstSubmitDate,
                        { color: colors.foreground },
                      ]}
                    >
                      {formatDate(firstSubmissionDate)} by 11:59 PM
                    </Text>
                    <Text
                      style={[
                        styles.firstSubmitWhat,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {form.goalType === "content"
                        ? "Paste the public URL of your published post (Instagram reel, YouTube Short, TikTok, etc.)"
                        : `Log at least ${stepGoalFinal.toLocaleString("en-IN")} steps from your health app or manually`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Proof rules box */}
              <View
                style={[
                  styles.proofRulesBox,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.proofRulesTitle,
                    { color: colors.foreground },
                  ]}
                >
                  How refunds work
                </Text>
                {form.goalType === "content" ? (
                  <>
                    <ProofRule
                      icon="check-circle"
                      color={colors.primary}
                      text={`Submit a valid public post URL on each active day → sent for manual review`}
                      colors={colors}
                    />
                    <ProofRule
                      icon="rotate-ccw"
                      color={colors.primary}
                      text={`If approved → ${formatCurrency(perDay, form.currency)} added to your wallet`}
                      colors={colors}
                    />
                    <ProofRule
                      icon="x-circle"
                      color={colors.danger}
                      text={`Missed or rejected proof → ${formatCurrency(perDay, form.currency)} forfeited ${forfeitTarget}`}
                      colors={colors}
                    />
                    <ProofRule
                      icon="info"
                      color={colors.mutedForeground}
                      text="The link must be publicly accessible (not private/stories)"
                      colors={colors}
                    />
                  </>
                ) : (
                  <>
                    <ProofRule
                      icon="check-circle"
                      color={colors.primary}
                      text={`Submit ${stepGoalFinal.toLocaleString("en-IN")}+ steps by 11:59 PM → sent for manual review`}
                      colors={colors}
                    />
                    <ProofRule
                      icon="rotate-ccw"
                      color={colors.primary}
                      text={`If approved → ${formatCurrency(perDay, form.currency)} added to your wallet`}
                      colors={colors}
                    />
                    <ProofRule
                      icon="x-circle"
                      color={colors.danger}
                      text={`Steps below goal, missed, or rejected proof → ${formatCurrency(perDay, form.currency)} forfeited ${forfeitTarget}`}
                      colors={colors}
                    />
                    <ProofRule
                      icon="smartphone"
                      color={colors.mutedForeground}
                      text="Health app auto-sync available in full build — manual entry for now"
                      colors={colors}
                    />
                  </>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
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
            activeOpacity={0.85}
            style={{ opacity: canNext() ? 1 : 0.5 }}
          >
            {canNext() ? (
              <LinearGradient
                colors={["#00C853", "#00E676"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtn}
              >
                <Text style={[styles.nextBtnText, { color: "#000" }]}>
                  {step === 3 ? "Start Stake" : "Continue"}
                </Text>
                <Feather
                  name={step === 3 ? "check" : "arrow-right"}
                  size={18}
                  color="#000"
                />
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.nextBtn,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text
                  style={[
                    styles.nextBtnText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {step === 3 ? "Start Stake" : "Continue"}
                </Text>
                <Feather
                  name={step === 3 ? "check" : "arrow-right"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function RRow({
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
    <View style={rrS.row}>
      <Text style={[rrS.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text
        style={[rrS.value, { color: valueColor ?? colors.foreground }]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

function RDiv({ colors }: { colors: any }) {
  return <View style={[rrS.div, { backgroundColor: colors.border }]} />;
}

function ProofRule({
  icon,
  color,
  text,
  colors,
}: {
  icon: string;
  color: string;
  text: string;
  colors: any;
}) {
  return (
    <View style={prS.row}>
      <Feather name={icon as any} size={13} color={color} style={prS.icon} />
      <Text style={[prS.text, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

const rrS = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 11,
    gap: 16,
  },
  label: { fontSize: 13, fontFamily: "Inter_400Regular", flexShrink: 0 },
  value: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
    flex: 1,
  },
  div: { height: 1 },
});

const prS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  icon: { marginTop: 1 },
  text: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
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
  headerBtn: { width: 40, alignItems: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  stepsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  stepItem: { flex: 1, alignItems: "center", gap: 4 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { fontSize: 11, color: "#000", fontFamily: "Inter_600SemiBold" },
  stepLabel: { fontSize: 10 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  stepContent: { gap: 12, paddingTop: 8 },
  stepTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 2 },
  stepSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  fieldHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -6 },
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
  // Goal type — side by side
  goalTypeRow: { flexDirection: "row", gap: 10 },
  goalCard: { flex: 1, borderRadius: 14, padding: 12, gap: 8 },
  goalCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  goalCardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  goalCardProof: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  // Start date
  datePillsRow: { gap: 8, paddingVertical: 4 },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 62,
  },
  datePillTop: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  datePillBottom: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  // Days of week
  daysRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  // Duration
  durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    minWidth: "45%",
  },
  durationLabel: { fontSize: 14 },
  durationSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  // Posts per day
  countRow: { flexDirection: "row", gap: 10 },
  countBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  countBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  // Step presets
  stepPresetsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stepPresetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stepPresetText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  // Schedule summary
  scheduleSummary: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 0,
  },
  scheduleSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  scheduleSummaryLabel: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  scheduleSummaryVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scheduleSummaryDivider: { height: 1 },
  // Stake presets
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetBtn: {
    flex: 1,
    minWidth: "44%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    gap: 2,
  },
  presetAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  presetPerDay: { fontSize: 10, fontFamily: "Inter_400Regular" },
  // Currency
  currencyRow: { flexDirection: "row", gap: 10 },
  currencyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  currencyText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  // Refund chip
  refundChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  refundChipMain: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  refundChipSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  forfeitGrid: { gap: 10 },
  forfeitOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 13,
  },
  forfeitTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  forfeitBody: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginTop: 2,
  },
  // Review
  dateBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  dateBannerSide: { flex: 1, alignItems: "center", gap: 4 },
  dateBannerLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dateBannerDate: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  reviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  firstSubmitBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  firstSubmitTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  firstSubmitDate: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  firstSubmitWhat: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 4,
  },
  proofRulesBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  proofRulesTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
