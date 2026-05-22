import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrutalistBackdrop } from "@/components/BrutalistBackdrop";
import { CHARITY_DESTINATIONS, charityName } from "@/constants/charities";
import {
  Commitment,
  ForfeitDestination,
  GoalType,
  useCommitments,
} from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import { useFirstName } from "@/hooks/useCurrentUser";
import { usePersistedState } from "@/hooks/usePersistedState";
import {
  DurationType,
  daysBetween,
  formatCountdown,
  formatCurrency,
  formatDate,
  formatDaysOfWeek,
  formatStartDateOption,
  getDayName,
  getEndDateForDuration,
  getMsUntilDeadline,
  MAX_PACT_AMOUNT_INR,
  MIN_PACT_AMOUNT_INR,
  getScheduledDates,
  getPactAmountPresets,
  getStartDateOptions,
  getTodayStr,
} from "@/utils/commitment";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const NAME_EXAMPLES: Record<GoalType, string[]> = {
  content: [
    "Daily reels for June",
    "Post every weekday in Q2",
    "Twitter ladder to 10k",
    "Newsletter every Sunday",
  ],
  workout: [
    "5 workouts a week for 30 days",
    "Run 3x weekly",
    "Yoga every morning",
    "Lift Mon / Wed / Fri",
  ],
};

function useRotatingPlaceholder(options: string[], intervalMs = 2500): string {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((n) => (n + 1) % options.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [options, intervalMs]);
  return options[i];
}

type StepKey =
  | "type"
  | "name"
  | "days"
  | "postsPerDay"
  | "start"
  | "amount"
  | "charity"
  | "review";

interface FormData {
  name: string;
  goalType: GoalType;
  startDate: string;
  daysOfWeek: number[];
  durationType: DurationType;
  targetPerDay: number;
  pactAmount: string;
  currency: string;
  forfeitDestination: ForfeitDestination;
}

export default function NewCommitmentScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string | string[];
    step?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { addCommitment } = useCommitments();
  const firstName = useFirstName();
  const appliedIntentRef = useRef(false);

  const [stepIndex, setStepIndex, stepHydrated, clearStep] =
    usePersistedState<number>("newCommitment.stepIndex", 0);
  const [creating, setCreating] = useState(false);
  const [form, setForm, formHydrated, clearForm] = usePersistedState<FormData>(
    "newCommitment.form",
    {
      name: "",
      goalType: "content",
      startDate: getTodayStr(),
      daysOfWeek: [1, 2, 3, 4, 5],
      durationType: "month",
      targetPerDay: 1,
      pactAmount: "3000",
      currency: "INR",
      forfeitDestination: "akshaya_patra",
    },
  );
  const intentType = Array.isArray(params.type) ? params.type[0] : params.type;
  const intentStep = Array.isArray(params.step) ? params.step[0] : params.step;

  useEffect(() => {
    if (appliedIntentRef.current || !formHydrated || !stepHydrated) return;
    const goalType =
      intentType === "workout" || intentType === "content" ? intentType : null;
    if (!goalType) return;
    appliedIntentRef.current = true;
    setForm((prev) => ({ ...prev, goalType }));
    if (intentStep === "name") setStepIndex(1);
  }, [
    formHydrated,
    intentStep,
    intentType,
    setForm,
    setStepIndex,
    stepHydrated,
  ]);

  const steps: StepKey[] =
    form.goalType === "workout"
      ? ["type", "name", "days", "start", "amount", "charity", "review"]
      : [
          "type",
          "name",
          "days",
          "postsPerDay",
          "start",
          "amount",
          "charity",
          "review",
        ];
  // Clamp stepIndex in case goalType changed between sessions (workout has fewer steps)
  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  useEffect(() => {
    if (stepIndex !== safeStepIndex) setStepIndex(safeStepIndex);
  }, [stepIndex, safeStepIndex, setStepIndex]);
  const stepKey = steps[safeStepIndex];

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
        : [...form.daysOfWeek, day].sort((a, b) => a - b),
    );
  }

  const endDate = getEndDateForDuration(form.startDate, form.durationType);
  const mockCommitment = {
    daysOfWeek: form.daysOfWeek,
    durationDays: daysBetween(form.startDate, endDate),
    startDate: form.startDate,
    endDate,
    pactAmount: parseFloat(form.pactAmount) || 0,
    currency: form.currency,
    checkIns: [],
  } as unknown as Commitment;

  const scheduledDates = getScheduledDates(mockCommitment);
  const scheduledDays = scheduledDates.length;
  const perDay =
    scheduledDays > 0 ? (parseFloat(form.pactAmount) || 0) / scheduledDays : 0;
  const pactAmount = parseFloat(form.pactAmount) || 0;
  const pactAmountInRange =
    form.currency !== "INR" ||
    (pactAmount >= MIN_PACT_AMOUNT_INR && pactAmount <= MAX_PACT_AMOUNT_INR);
  const firstSubmissionDate = scheduledDates[0] ?? null;

  const isFirstSubmissionToday = firstSubmissionDate === getTodayStr();
  const [msUntilDeadline, setMsUntilDeadline] = useState(getMsUntilDeadline());
  useEffect(() => {
    if (!isFirstSubmissionToday) return;
    const interval = setInterval(() => {
      setMsUntilDeadline(getMsUntilDeadline());
    }, 30_000);
    return () => clearInterval(interval);
  }, [isFirstSubmissionToday]);
  const firstSubmissionLabel = isFirstSubmissionToday
    ? `Today by 11:59 PM · ${formatCountdown(msUntilDeadline)}`
    : `${formatDate(firstSubmissionDate ?? "")} by 11:59 PM`;
  const firstSubmissionShort = isFirstSubmissionToday
    ? `Today · ${formatCountdown(msUntilDeadline).replace(" left", "")}`
    : formatDate(firstSubmissionDate ?? "");

  function canNext(): boolean {
    switch (stepKey) {
      case "type":
        return true;
      case "name":
        return form.name.trim().length > 0;
      case "days":
        return form.daysOfWeek.length > 0;
      case "postsPerDay":
        return form.targetPerDay > 0;
      case "start":
        return form.startDate.length > 0;
      case "amount":
        return pactAmount > 0 && pactAmountInRange;
      case "charity":
        return true;
      case "review":
        return true;
    }
  }

  function handleNext() {
    if (!canNext() || creating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (safeStepIndex < steps.length - 1) {
      setStepIndex(safeStepIndex + 1);
    } else {
      void handleCreate();
    }
  }

  function handleBack() {
    if (safeStepIndex === 0) router.back();
    else setStepIndex(safeStepIndex - 1);
  }

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    const commitmentId = await addCommitment({
      name: form.name.trim(),
      goalType: form.goalType,
      daysOfWeek: form.daysOfWeek,
      targetPerDay: form.targetPerDay,
      durationDays: daysBetween(form.startDate, endDate),
      pactAmount,
      currency: form.currency,
      forfeitDestination: form.forfeitDestination,
      startDate: form.startDate,
      endDate,
    });
    setCreating(false);
    if (!commitmentId) {
      Alert.alert("Could not create pact", "Please try again.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearForm();
    clearStep();
    router.replace(`/commitment/${commitmentId}`);
  }

  const topPadding = Platform.OS === "web" ? 12 : insets.top;
  const progress = (safeStepIndex + 1) / steps.length;
  const isReview = stepKey === "review";
  const namePlaceholder = useRotatingPlaceholder(NAME_EXAMPLES[form.goalType]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrutalistBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.headerBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View
            style={[styles.progressTrack, { backgroundColor: colors.border }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            key={stepKey}
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(140)}
            style={styles.stepContent}
          >
            {stepKey === "type" && (
              <StepQuestion text="Pact type" colors={colors}>
                <View style={styles.typeRow}>
                  {(
                    [
                      {
                        type: "content" as const,
                        icon: "video",
                        label: "Content",
                      },
                      {
                        type: "workout" as const,
                        icon: "activity",
                        label: "Workout",
                      },
                    ] as const
                  ).map((opt) => {
                    const sel = form.goalType === opt.type;
                    return (
                      <TouchableOpacity
                        key={opt.type}
                        onPress={() => update("goalType", opt.type)}
                        activeOpacity={0.85}
                        style={[
                          styles.typeCard,
                          {
                            backgroundColor: sel
                              ? colors.primary + "18"
                              : "transparent",
                            borderColor: sel ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Feather
                          name={opt.icon as any}
                          size={28}
                          color={sel ? colors.primary : colors.foreground}
                        />
                        <Text
                          style={[
                            styles.typeLabel,
                            {
                              color: sel ? colors.primary : colors.foreground,
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </StepQuestion>
            )}

            {stepKey === "name" && (
              <View style={styles.answerSlot}>
                <TextInput
                  autoFocus
                  style={[styles.bareInput, { color: colors.foreground }]}
                  placeholder={namePlaceholder}
                  placeholderTextColor={colors.mutedForeground + "66"}
                  value={form.name}
                  onChangeText={(v) => update("name", v)}
                  maxLength={80}
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
                <InlineActions
                  onBack={handleBack}
                  onNext={handleNext}
                  canNext={canNext()}
                  creating={creating}
                  isReview={false}
                  colors={colors}
                />
              </View>
            )}

            {stepKey === "days" && (
              <StepQuestion text="Days" colors={colors}>
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
                            backgroundColor: sel
                              ? colors.primary
                              : "transparent",
                            borderColor: sel ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            {
                              color: sel
                                ? colors.primaryForeground
                                : colors.foreground,
                            },
                          ]}
                        >
                          {getDayName(d)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </StepQuestion>
            )}

            {stepKey === "postsPerDay" && (
              <StepQuestion text="Posts per day" colors={colors}>
                <View style={styles.countRow}>
                  {[1, 2, 3].map((n) => {
                    const sel = form.targetPerDay === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        onPress={() => update("targetPerDay", n)}
                        activeOpacity={0.8}
                        style={[
                          styles.countChip,
                          {
                            backgroundColor: sel
                              ? colors.primary
                              : "transparent",
                            borderColor: sel ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.countChipText,
                            {
                              color: sel
                                ? colors.primaryForeground
                                : colors.foreground,
                            },
                          ]}
                        >
                          {n}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </StepQuestion>
            )}

            {stepKey === "start" && (
              <StepQuestion text="Start date" colors={colors}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.datePillsRow}
                >
                  {getStartDateOptions(30).map((dateStr) => {
                    const sel = form.startDate === dateStr;
                    const opt = formatStartDateOption(dateStr);
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        onPress={() => update("startDate", dateStr)}
                        activeOpacity={0.8}
                        style={[
                          styles.datePill,
                          {
                            backgroundColor: sel
                              ? colors.primary
                              : "transparent",
                            borderColor: sel ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.datePillTop,
                            {
                              color: sel
                                ? colors.primaryForeground
                                : colors.mutedForeground,
                            },
                          ]}
                        >
                          {opt.line1}
                        </Text>
                        <Text
                          style={[
                            styles.datePillBottom,
                            {
                              color: sel
                                ? colors.primaryForeground
                                : colors.foreground,
                            },
                          ]}
                        >
                          {opt.line2}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </StepQuestion>
            )}

            {stepKey === "amount" && (
              <StepQuestion text="Deposit" colors={colors}>
                <View style={styles.amountRow}>
                  <Text
                    style={[
                      styles.amountSymbol,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    ₹
                  </Text>
                  <TextInput
                    autoFocus
                    style={[styles.amountInput, { color: colors.foreground }]}
                    placeholder="3000"
                    placeholderTextColor={colors.mutedForeground + "55"}
                    value={form.pactAmount}
                    onChangeText={(v) =>
                      update("pactAmount", v.replace(/[^0-9.]/g, ""))
                    }
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                </View>
                {scheduledDays > 0 && (
                  <View style={styles.presetRow}>
                    {getPactAmountPresets(scheduledDays, form.currency).map(
                      (preset) => {
                        const sel =
                          parseFloat(form.pactAmount) === preset &&
                          !form.pactAmount.includes(".");
                        return (
                          <TouchableOpacity
                            key={preset}
                            onPress={() => update("pactAmount", String(preset))}
                            activeOpacity={0.8}
                            style={[
                              styles.presetChip,
                              {
                                borderColor: sel
                                  ? colors.primary
                                  : colors.border,
                                backgroundColor: sel
                                  ? colors.primary + "18"
                                  : "transparent",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                {
                                  color: sel
                                    ? colors.primary
                                    : colors.foreground,
                                },
                              ]}
                            >
                              {formatCurrency(preset, form.currency)}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                )}
                {scheduledDays > 0 && pactAmount > 0 && (
                  <Text
                    style={[styles.hint, { color: colors.mutedForeground }]}
                  >
                    {formatCurrency(perDay, form.currency)} refund credit per
                    successful day
                  </Text>
                )}
                {form.currency === "INR" &&
                  !pactAmountInRange &&
                  pactAmount > 0 && (
                    <Text style={[styles.errorHint, { color: colors.danger }]}>
                      Beta deposits must be between{" "}
                      {formatCurrency(MIN_PACT_AMOUNT_INR, form.currency)} and{" "}
                      {formatCurrency(MAX_PACT_AMOUNT_INR, form.currency)}.
                    </Text>
                  )}
              </StepQuestion>
            )}

            {stepKey === "charity" && (
              <StepQuestion text="Charity" colors={colors}>
                <View style={styles.charityList}>
                  {CHARITY_DESTINATIONS.map((opt) => {
                    const sel = form.forfeitDestination === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => update("forfeitDestination", opt.id)}
                        activeOpacity={0.8}
                        style={styles.charityRow}
                      >
                        <View
                          style={[
                            styles.radio,
                            {
                              borderColor: sel ? colors.primary : colors.border,
                              backgroundColor: sel
                                ? colors.primary
                                : "transparent",
                            },
                          ]}
                        >
                          {sel && (
                            <Feather
                              name="check"
                              size={12}
                              color={colors.primaryForeground}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.charityName,
                              {
                                color: sel ? colors.primary : colors.foreground,
                              },
                            ]}
                          >
                            {opt.name}
                          </Text>
                          <Text
                            style={[
                              styles.charityDesc,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {opt.description}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </StepQuestion>
            )}

            {stepKey === "review" && (
              <View style={styles.answerSlot}>
                <Text style={[styles.question, { color: colors.foreground }]}>
                  {firstName ? `${firstName}, review the pact` : "Review the pact"}
                </Text>

                <Text style={[styles.reviewName, { color: colors.foreground }]}>
                  {form.name}
                </Text>

                <PactScheduleCalendar
                  startDate={form.startDate}
                  endDate={endDate}
                  scheduledDates={scheduledDates}
                  colors={colors}
                />

                <View style={styles.reviewList}>
                  <ReviewLine
                    label="Deposit"
                    value={formatCurrency(
                      parseFloat(form.pactAmount) || 0,
                      form.currency,
                    )}
                    colors={colors}
                  />
                  <ReviewLine
                    label="Per successful day"
                    value={formatCurrency(perDay, form.currency)}
                    colors={colors}
                  />
                  <ReviewLine
                    label="If missed"
                    value={charityName(form.forfeitDestination)}
                    colors={colors}
                  />
                  <ReviewLine
                    label="First proof"
                    value={firstSubmissionShort}
                    colors={colors}
                  />
                </View>

                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Create draft. Pay to start.
                </Text>
                <View
                  style={[
                    styles.rulesBox,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <Text
                    style={[styles.rulesTitle, { color: colors.foreground }]}
                  >
                    The deal
                  </Text>
                  <Text
                    style={[
                      styles.rulesText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Show proof by {firstSubmissionLabel}. Missed or rejected days
                    go to {charityName(form.forfeitDestination)}.
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Footer (hidden for text-input steps which use inline actions) */}
        {stepKey !== "name" && (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
              },
            ]}
          >
            <InlineActions
              onBack={handleBack}
              onNext={handleNext}
              canNext={canNext()}
              creating={creating}
              isReview={isReview}
              colors={colors}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function InlineActions({
  onBack,
  onNext,
  canNext,
  creating,
  isReview,
  colors,
}: {
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  creating: boolean;
  isReview: boolean;
  colors: any;
}) {
  const busy = creating;
  const label = creating ? "Creating…" : isReview ? "Create draft" : "Continue";
  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
        style={[styles.backBtn, { borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Feather name="arrow-left" size={18} color={colors.foreground} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onNext}
        disabled={!canNext || busy}
        activeOpacity={0.85}
        style={[styles.nextBtnWrap, { opacity: canNext && !busy ? 1 : 0.4 }]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.nextBtn}
        >
          <Text style={styles.nextBtnText}>{label}</Text>
          <Feather
            name={isReview ? "check" : "arrow-right"}
            size={18}
            color={colors.primaryForeground}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const CAL_DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function PactScheduleCalendar({
  startDate,
  endDate,
  scheduledDates,
  colors,
}: {
  startDate: string;
  endDate: string;
  scheduledDates: string[];
  colors: any;
}) {
  const today = getTodayStr();
  const scheduledSet = new Set(scheduledDates);

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  // Window: from Sunday of start's week to Saturday of end's week
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - start.getDay());
  const gridEnd = new Date(end);
  gridEnd.setDate(end.getDate() + (6 - end.getDay()));
  const totalCells =
    Math.round((gridEnd.getTime() - gridStart.getTime()) / 86_400_000) + 1;

  const cells: { date: Date; dateStr: string }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({ date: d, dateStr: ymd(d) });
  }

  return (
    <View>
      <View style={styles.calHeader}>
        {CAL_DAY_LABELS.map((d) => (
          <Text
            key={d}
            style={[styles.calHeaderText, { color: colors.mutedForeground }]}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map(({ date, dateStr }) => {
          const inWindow = dateStr >= startDate && dateStr <= endDate;
          const isScheduled = scheduledSet.has(dateStr);
          const isToday = dateStr === today;

          let bg = "transparent";
          let textColor = colors.border;
          if (!inWindow) {
            bg = "transparent";
            textColor = colors.border + "44";
          } else if (isScheduled) {
            bg = colors.primary + "22";
            textColor = colors.primary;
          } else {
            bg = colors.card;
            textColor = colors.mutedForeground;
          }

          return (
            <View
              key={dateStr}
              style={[
                styles.calCell,
                {
                  backgroundColor: bg,
                  borderColor: isToday ? colors.accent : "transparent",
                },
              ]}
            >
              <Text style={[styles.calCellText, { color: textColor }]}>
                {date.getDate()}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ReviewLine({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.reviewRow,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[styles.reviewValue, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function StepQuestion({
  text,
  colors,
  children,
}: {
  text: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <>
      <Text style={[styles.question, { color: colors.foreground }]}>
        {text}
      </Text>
      <View style={styles.answerSlot}>{children}</View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerBtn: { width: 32, alignItems: "flex-start" },
  progressTrack: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: { height: 2, borderRadius: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  stepContent: { gap: 32 },
  question: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  answerSlot: { gap: 16 },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  errorHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 17,
  },

  // Type
  typeRow: { flexDirection: "row", gap: 12 },
  typeCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  typeLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  // Name
  bareInput: {
    fontSize: 22,
    fontFamily: "Inter_500Medium",
    paddingVertical: 8,
    lineHeight: 30,
  },

  // Days
  daysRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 48,
    alignItems: "center",
  },
  dayChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Posts per day
  countRow: { flexDirection: "row", gap: 12 },
  countChip: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  countChipText: { fontSize: 22, fontFamily: "Inter_700Bold" },

  // Start
  datePillsRow: { gap: 8, paddingVertical: 4 },
  datePill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 68,
  },
  datePillTop: { fontSize: 11, fontFamily: "Inter_500Medium" },
  datePillBottom: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },

  // Amount
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingVertical: 8,
  },
  amountSymbol: { fontSize: 32, fontFamily: "Inter_500Medium" },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    paddingVertical: 4,
  },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  presetChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Charity
  charityList: { gap: 4 },
  charityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  charityName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  charityDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 17,
  },

  // Review
  reviewName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  rulesBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  rulesTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  rulesText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  // Schedule calendar
  calHeader: { flexDirection: "row", marginBottom: 4 },
  calHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1.5,
  },
  calCellText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  reviewList: { gap: 8 },
  reviewRow: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  reviewLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  reviewValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnWrap: { flex: 1 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  nextBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
