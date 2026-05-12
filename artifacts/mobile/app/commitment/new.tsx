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
  formatDaysOfWeek,
  getDayName,
  getRefundPerDay,
  getTodayStr,
  getTotalCommittedDays,
  getScheduledDates,
  getPeriodLabel,
} from "@/utils/commitment";
import { Commitment } from "@/contexts/CommitmentsContext";

const DURATION_OPTIONS = [
  { label: "1 Week", days: 7 },
  { label: "2 Weeks", days: 14 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
];

const STEP_PRESETS = [5000, 7500, 10000, 15000];
const CURRENCY_OPTIONS = ["INR", "USD"];

type Step = 0 | 1 | 2 | 3;

interface FormData {
  name: string;
  goalType: GoalType;
  daysOfWeek: number[];
  targetPerDay: number;
  customSteps: string;
  durationDays: number;
  stakeAmount: string;
  currency: string;
  friendName: string;
  friendContact: string;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function NewCommitmentScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addCommitment } = useCommitments();

  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormData>({
    name: "",
    goalType: "content",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri default
    targetPerDay: 1,
    customSteps: "",
    durationDays: 30,
    stakeAmount: "1000",
    currency: "INR",
    friendName: "",
    friendContact: "",
  });

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(day: number) {
    const has = form.daysOfWeek.includes(day);
    if (has && form.daysOfWeek.length === 1) return; // keep at least 1
    update(
      "daysOfWeek",
      has
        ? form.daysOfWeek.filter((d) => d !== day)
        : [...form.daysOfWeek, day].sort((a, b) => a - b)
    );
  }

  function canNext(): boolean {
    if (step === 0) return form.name.trim().length > 0 && form.daysOfWeek.length > 0;
    if (step === 1) {
      if (form.goalType === "steps") {
        const s = form.customSteps.trim()
          ? parseInt(form.customSteps)
          : form.targetPerDay;
        return s > 0;
      }
      return form.targetPerDay > 0;
    }
    if (step === 2) return parseFloat(form.stakeAmount) > 0;
    return true;
  }

  function handleNext() {
    if (!canNext()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 3) {
      setStep((s) => (s + 1) as Step);
    } else {
      handleCreate();
    }
  }

  function handleBack() {
    if (step === 0) {
      router.back();
    } else {
      setStep((s) => (s - 1) as Step);
    }
  }

  function handleCreate() {
    const today = getTodayStr();
    const endDate = addDays(today, form.durationDays - 1);
    const stepGoal = form.customSteps.trim()
      ? parseInt(form.customSteps)
      : form.targetPerDay;
    addCommitment({
      name: form.name.trim(),
      goalType: form.goalType,
      daysOfWeek: form.daysOfWeek,
      targetPerDay: form.goalType === "steps" ? stepGoal : form.targetPerDay,
      durationDays: form.durationDays,
      stakeAmount: parseFloat(form.stakeAmount) || 0,
      currency: form.currency,
      startDate: today,
      endDate,
      friendName: form.friendName.trim() || undefined,
      friendContact: form.friendContact.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  }

  // Preview calculation
  const mockCommitment = {
    daysOfWeek: form.daysOfWeek,
    durationDays: form.durationDays,
    startDate: getTodayStr(),
    endDate: addDays(getTodayStr(), form.durationDays - 1),
    stakeAmount: parseFloat(form.stakeAmount) || 0,
    currency: form.currency,
  } as unknown as Commitment;

  const scheduledDays = getScheduledDates(mockCommitment).length;
  const perDay =
    scheduledDays > 0
      ? (parseFloat(form.stakeAmount) || 0) / scheduledDays
      : 0;
  const stepGoalFinal = form.customSteps.trim()
    ? parseInt(form.customSteps) || 0
    : form.targetPerDay;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const STEPS = ["Goal", "Schedule", "Stake", "Review"];

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
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            New Stake
          </Text>
          <View style={styles.backBtn} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepsRow}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      i <= step ? colors.primary : colors.border,
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
          {/* STEP 0 — Goal type + name */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                What are you committing to?
              </Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Choose a type and give your stake a name.
              </Text>

              {/* Goal type */}
              <View style={styles.goalTypeRow}>
                <TouchableOpacity
                  onPress={() => update("goalType", "content")}
                  activeOpacity={0.8}
                  style={[
                    styles.goalTypeCard,
                    {
                      backgroundColor:
                        form.goalType === "content"
                          ? colors.primary + "18"
                          : colors.card,
                      borderColor:
                        form.goalType === "content"
                          ? colors.primary
                          : colors.border,
                      borderWidth: form.goalType === "content" ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.goalTypeIconBox,
                      {
                        backgroundColor:
                          form.goalType === "content"
                            ? colors.primary + "22"
                            : colors.secondary,
                      },
                    ]}
                  >
                    <Feather
                      name="video"
                      size={22}
                      color={
                        form.goalType === "content"
                          ? colors.primary
                          : colors.mutedForeground
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.goalTypeTitle,
                      {
                        color:
                          form.goalType === "content"
                            ? colors.primary
                            : colors.foreground,
                      },
                    ]}
                  >
                    Content Creation
                  </Text>
                  <Text
                    style={[styles.goalTypeDesc, { color: colors.mutedForeground }]}
                  >
                    Post reels, videos, or any public content. Share the link to
                    claim.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    update("goalType", "steps");
                    update("targetPerDay", 10000);
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.goalTypeCard,
                    {
                      backgroundColor:
                        form.goalType === "steps"
                          ? colors.primary + "18"
                          : colors.card,
                      borderColor:
                        form.goalType === "steps"
                          ? colors.primary
                          : colors.border,
                      borderWidth: form.goalType === "steps" ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.goalTypeIconBox,
                      {
                        backgroundColor:
                          form.goalType === "steps"
                            ? colors.primary + "22"
                            : colors.secondary,
                      },
                    ]}
                  >
                    <Feather
                      name="activity"
                      size={22}
                      color={
                        form.goalType === "steps"
                          ? colors.primary
                          : colors.mutedForeground
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.goalTypeTitle,
                      {
                        color:
                          form.goalType === "steps"
                            ? colors.primary
                            : colors.foreground,
                      },
                    ]}
                  >
                    Daily Step Count
                  </Text>
                  <Text
                    style={[styles.goalTypeDesc, { color: colors.mutedForeground }]}
                  >
                    Hit your daily step goal. Log steps or sync your health app.
                  </Text>
                </TouchableOpacity>
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
                    ? "e.g. Post daily reels in June"
                    : "e.g. Walk 10k steps every day"
                }
                placeholderTextColor={colors.mutedForeground}
                value={form.name}
                onChangeText={(v) => update("name", v)}
                maxLength={80}
                returnKeyType="next"
              />
            </View>
          )}

          {/* STEP 1 — Schedule */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Set your schedule
              </Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Which days will you do this, and what's your daily target?
              </Text>

              {/* Days of week */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Days of the week
              </Text>
              <View style={styles.daysRow}>
                {ALL_DAYS.map((d) => {
                  const selected = form.daysOfWeek.includes(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => toggleDay(d)}
                      activeOpacity={0.8}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          {
                            color: selected ? "#000" : colors.mutedForeground,
                          },
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
                {DURATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.days}
                    onPress={() => update("durationDays", opt.days)}
                    activeOpacity={0.8}
                    style={[
                      styles.durationBtn,
                      {
                        backgroundColor:
                          form.durationDays === opt.days
                            ? colors.primary + "22"
                            : colors.card,
                        borderColor:
                          form.durationDays === opt.days
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
                            form.durationDays === opt.days
                              ? colors.primary
                              : colors.mutedForeground,
                          fontFamily:
                            form.durationDays === opt.days
                              ? "Inter_600SemiBold"
                              : "Inter_400Regular",
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Daily target */}
              {form.goalType === "content" && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    Posts per committed day
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
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    Daily step goal
                  </Text>
                  <View style={styles.stepPresetsGrid}>
                    {STEP_PRESETS.map((n) => (
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
                            backgroundColor:
                              form.targetPerDay === n &&
                              !form.customSteps.trim()
                                ? colors.primary + "22"
                                : colors.card,
                            borderColor:
                              form.targetPerDay === n &&
                              !form.customSteps.trim()
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepPresetText,
                            {
                              color:
                                form.targetPerDay === n &&
                                !form.customSteps.trim()
                                  ? colors.primary
                                  : colors.mutedForeground,
                            },
                          ]}
                        >
                          {n.toLocaleString("en-IN")}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
                    placeholder="Custom step count"
                    placeholderTextColor={colors.mutedForeground}
                    value={form.customSteps}
                    onChangeText={(v) => update("customSteps", v.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </>
              )}

              {/* Schedule preview */}
              {form.daysOfWeek.length > 0 && (
                <View
                  style={[
                    styles.schedulePreview,
                    { backgroundColor: colors.secondary, borderColor: colors.border },
                  ]}
                >
                  <Feather name="calendar" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.schedulePreviewText, { color: colors.mutedForeground }]}>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                      {scheduledDays}
                    </Text>{" "}
                    committed days over{" "}
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                      {getPeriodLabel(form.durationDays)}
                    </Text>{" "}
                    ({formatDaysOfWeek(form.daysOfWeek)})
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* STEP 2 — Stake */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Put your money down
              </Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Show up and get it back, one day at a time.
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
                          form.currency === cur
                            ? colors.primary
                            : colors.border,
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
                onChangeText={(v) =>
                  update("stakeAmount", v.replace(/[^0-9.]/g, ""))
                }
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              {scheduledDays > 0 &&
                parseFloat(form.stakeAmount) > 0 && (
                  <View
                    style={[
                      styles.refundPreview,
                      {
                        backgroundColor: colors.primary + "14",
                        borderColor: colors.primary + "33",
                      },
                    ]}
                  >
                    <Feather
                      name="rotate-ccw"
                      size={15}
                      color={colors.primary}
                    />
                    <View style={styles.refundPreviewText}>
                      <Text style={[styles.refundAmount, { color: colors.primary }]}>
                        {formatCurrency(perDay, form.currency)} refunded per day
                      </Text>
                      <Text style={[styles.refundSub, { color: colors.mutedForeground }]}>
                        across {scheduledDays} committed days
                      </Text>
                    </View>
                  </View>
                )}

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Forfeit to a friend (optional)
              </Text>
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                Missed days go to them instead of being lost.
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
            </View>
          )}

          {/* STEP 3 — Review */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Review your stake
              </Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Everything look right? Let's lock it in.
              </Text>

              <View
                style={[
                  styles.reviewCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <ReviewRow
                  label="Commitment"
                  value={form.name}
                  colors={colors}
                />
                <Divider colors={colors} />
                <ReviewRow
                  label="Type"
                  value={
                    form.goalType === "content"
                      ? "Content Creation"
                      : "Step Count"
                  }
                  colors={colors}
                />
                <Divider colors={colors} />
                <ReviewRow
                  label="Days"
                  value={formatDaysOfWeek(form.daysOfWeek)}
                  colors={colors}
                />
                <Divider colors={colors} />
                <ReviewRow
                  label="Duration"
                  value={getPeriodLabel(form.durationDays)}
                  colors={colors}
                />
                <Divider colors={colors} />
                <ReviewRow
                  label="Total days"
                  value={`${scheduledDays} committed days`}
                  colors={colors}
                />
                <Divider colors={colors} />
                {form.goalType === "steps" && (
                  <>
                    <ReviewRow
                      label="Daily goal"
                      value={`${stepGoalFinal.toLocaleString("en-IN")} steps`}
                      colors={colors}
                    />
                    <Divider colors={colors} />
                  </>
                )}
                {form.goalType === "content" && (
                  <>
                    <ReviewRow
                      label="Daily posts"
                      value={`${form.targetPerDay} post${form.targetPerDay > 1 ? "s" : ""}`}
                      colors={colors}
                    />
                    <Divider colors={colors} />
                    <ReviewRow
                      label="Proof required"
                      value="Public post URL"
                      colors={colors}
                    />
                    <Divider colors={colors} />
                  </>
                )}
                <ReviewRow
                  label="Total staked"
                  value={formatCurrency(
                    parseFloat(form.stakeAmount) || 0,
                    form.currency
                  )}
                  colors={colors}
                  valueColor={colors.accent}
                />
                <Divider colors={colors} />
                <ReviewRow
                  label="Refund per day"
                  value={formatCurrency(perDay, form.currency)}
                  colors={colors}
                  valueColor={colors.primary}
                />
                {form.friendName ? (
                  <>
                    <Divider colors={colors} />
                    <ReviewRow
                      label="Forfeit to"
                      value={`${form.friendName}${form.friendContact ? ` · ${form.friendContact}` : ""}`}
                      colors={colors}
                    />
                  </>
                ) : null}
              </View>

              <View
                style={[
                  styles.infoBox,
                  {
                    backgroundColor: colors.accent + "14",
                    borderColor: colors.accent + "33",
                  },
                ]}
              >
                <Feather name="info" size={14} color={colors.accent} />
                <Text
                  style={[styles.infoText, { color: colors.mutedForeground }]}
                >
                  {form.goalType === "content"
                    ? "After posting, submit your public link before 11:59 PM to claim your refund. No link = no refund for that day."
                    : "Log your steps before 11:59 PM. You must hit your daily goal to qualify for the refund."}
                </Text>
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
              paddingBottom:
                Platform.OS === "web" ? 34 : insets.bottom + 16,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleNext}
            disabled={!canNext()}
            style={[
              styles.nextBtn,
              {
                backgroundColor: canNext()
                  ? colors.primary
                  : colors.secondary,
                opacity: canNext() ? 1 : 0.5,
              },
            ]}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.nextBtnText,
                {
                  color: canNext() ? "#000" : colors.mutedForeground,
                },
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
    <View style={rrStyles.row}>
      <Text style={[rrStyles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[
          rrStyles.value,
          { color: valueColor ?? colors.foreground },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return (
    <View style={[rrStyles.divider, { backgroundColor: colors.border }]} />
  );
}

const rrStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 11,
    gap: 16,
  },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  value: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
    flex: 1,
  },
  divider: { height: 1 },
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
  backBtn: { width: 40, alignItems: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  stepsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  stepContent: { gap: 12, paddingTop: 8 },
  stepTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 2 },
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
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: -6,
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
  goalTypeRow: { gap: 12 },
  goalTypeCard: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  goalTypeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  goalTypeTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  goalTypeDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  durationText: { fontSize: 13 },
  countRow: { flexDirection: "row", gap: 10 },
  countBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  countBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  stepPresetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stepPresetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  stepPresetText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  schedulePreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  schedulePreviewText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  currencyRow: { flexDirection: "row", gap: 10 },
  currencyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  currencyText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  refundPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: -2,
  },
  refundPreviewText: { flex: 1 },
  refundAmount: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  refundSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  reviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
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
  nextBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
