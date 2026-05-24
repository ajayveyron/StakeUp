import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";

import { useFirstName } from "@/hooks/useCurrentUser";
import {
  Alert,
  type LayoutRectangle,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrutalistBackdrop } from "@/components/BrutalistBackdrop";
import { CheckInModal } from "@/components/CheckInModal";
import { CompactCycleCalendar } from "@/components/CompactCycleCalendar";
import { CommitmentCard } from "@/components/CommitmentCard";
import type {
  CommitmentCardAction,
  CommitmentCardStatus,
} from "@/components/CommitmentCard";
import {
  DirectionalSwap,
  type MotionDirection,
} from "@/components/motion/DirectionalSwap";
import { ExpandablePanel } from "@/components/motion/ExpandablePanel";
import { MotionPressable } from "@/components/motion/MotionPressable";
import { RavenMark } from "@/components/RavenMark";
import { SlidingIndicator } from "@/components/motion/SlidingIndicator";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Commitment,
  ProofLocation,
  useCommitments,
} from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import {
  addDays,
  formatCountdown,
  formatCurrency,
  getCheckInForDate,
  getCheckInStatus,
  getMsUntilDeadline,
  getScheduledDates,
  getNextScheduledDate,
  getTodayStr,
  getTotalCommittedDays,
  getTotalRefunded,
  getVerifiedCheckIns,
  hasTodayCheckIn,
  isActive,
  isDraft,
  isNotStarted,
  isPendingDeposit,
  isPendingPayment,
  isTodayScheduled,
} from "@/utils/commitment";

type HomeIconName = React.ComponentProps<typeof Feather>["name"];

function formatComeBackLabel(date: string | null) {
  if (!date) return "Come back on the next proof day";
  const today = getTodayStr();
  if (date === addDays(today, 1)) return "Come back tomorrow";

  const d = new Date(date + "T00:00:00");
  const submissionDay = d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `Come back on ${submissionDay}`;
}

function dateStripFor(today: string) {
  return [-5, -4, -3, -2, -1, 0, 1].map((offset) => addDays(today, offset));
}

function dayInitial(date: string) {
  return new Date(date + "T00:00:00")
    .toLocaleDateString("en-IN", { weekday: "short" })
    .slice(0, 1);
}

function dayNumber(date: string) {
  return new Date(date + "T00:00:00").getDate().toString();
}

function dateLabel(date: string) {
  const today = getTodayStr();
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  if (date === addDays(today, 1)) return "Tomorrow";
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function layoutsMatch(a: LayoutRectangle | undefined, b: LayoutRectangle) {
  if (!a) return false;
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function isScheduledForDate(commitment: Commitment, date: string) {
  return getScheduledDates(commitment).includes(date);
}

function commitmentIsVisibleForDate(commitment: Commitment, date: string) {
  if (isPendingPayment(commitment)) return false;
  if (commitment.status === "deleted") return false;
  if (date >= commitment.startDate && date <= commitment.endDate) return true;
  return isNotStarted(commitment) && date < commitment.startDate;
}

function dayStatusRank(commitment: Commitment, date: string) {
  const today = getTodayStr();
  const checkInStatus = getCheckInStatus(getCheckInForDate(commitment, date));
  const scheduled = isScheduledForDate(commitment, date);

  if (scheduled && date === today && !hasTodayCheckIn(commitment)) return 0;
  if (checkInStatus === "under_review") return 1;
  if (checkInStatus === "approved") return 2;
  if (checkInStatus === "rejected" || checkInStatus === "missed") return 3;
  if (scheduled && date < today) return 4;
  if (scheduled) return 5;
  if (isNotStarted(commitment) || date < commitment.startDate) return 6;
  return 7;
}

function statusTone(
  colors: ReturnType<typeof useColors>,
  tone: "good" | "warn" | "bad" | "muted",
) {
  if (tone === "good") {
    return {
      color: colors.success,
      backgroundColor: colors.success + "14",
      borderColor: colors.success + "33",
    };
  }
  if (tone === "warn") {
    return {
      color: colors.accent,
      backgroundColor: colors.accent + "14",
      borderColor: colors.accent + "33",
    };
  }
  if (tone === "bad") {
    return {
      color: colors.danger,
      backgroundColor: colors.danger + "12",
      borderColor: colors.danger + "33",
    };
  }
  return {
    color: colors.mutedForeground,
    backgroundColor: colors.secondary,
    borderColor: colors.border,
  };
}

function dayStatusFor(
  commitment: Commitment,
  date: string,
  colors: ReturnType<typeof useColors>,
): CommitmentCardStatus {
  const today = getTodayStr();
  const checkInStatus = getCheckInStatus(getCheckInForDate(commitment, date));
  const scheduled = isScheduledForDate(commitment, date);

  function status(
    label: string,
    icon: HomeIconName,
    tone: "good" | "warn" | "bad" | "muted",
  ) {
    return { label, icon, ...statusTone(colors, tone) };
  }

  if (isNotStarted(commitment) || date < commitment.startDate) {
    return status("Not started", "play", "muted");
  }
  if (commitment.status === "ended") {
    return status("Pact ended", "slash", "muted");
  }
  if (date > commitment.endDate) {
    return status("Closed", "flag", "muted");
  }
  if (!scheduled) {
    return status("No proof due", "calendar", "muted");
  }
  if (checkInStatus === "approved") {
    return status("Successful day", "check-circle", "good");
  }
  if (checkInStatus === "under_review") {
    return status("Proof with Raven", "clock", "warn");
  }
  if (checkInStatus === "rejected") {
    return status("Rejected day", "x-circle", "bad");
  }
  if (checkInStatus === "missed" || date < today) {
    return status("Missed day", "alert-circle", "bad");
  }
  if (date === today) {
    return status("Proof due today", "clock", "warn");
  }
  return status("Proof day", "calendar", "muted");
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { commitments, submitContentCheckIn, submitWorkoutCheckIn } =
    useCommitments();
  const slotSummary = useQuery(api.payments.slotSummary);
  const { buySlot, payDeposit, paying } = useRazorpayCheckout({
    onSlotSuccess: () =>
      Alert.alert(
        "Pact Pass ready",
        "Now lock the refundable deposit on one draft to start.",
      ),
    onDepositSuccess: () => Alert.alert("Deposit locked", "Your pact is live."),
  });

  const [selectedCommitment, setSelectedCommitment] =
    useState<Commitment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(getMsUntilDeadline());
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [dateDirection, setDateDirection] = useState<MotionDirection>(0);
  const [dateLayouts, setDateLayouts] = useState<
    Record<string, LayoutRectangle | undefined>
  >({});
  const [cycleCalendarOpen, setCycleCalendarOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getMsUntilDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const today = getTodayStr();
  const pendingPaymentCommitments = commitments.filter(isPendingPayment);
  const confirmedCommitments = commitments.filter((c) => !isPendingPayment(c));
  const dateStrip = dateStripFor(today);
  const dateStripKey = dateStrip.join("|");
  const earnedBack = confirmedCommitments.reduce(
    (sum, c) => sum + getTotalRefunded(c),
    0,
  );
  const selectedDayCommitments = confirmedCommitments
    .filter((c) => commitmentIsVisibleForDate(c, selectedDate))
    .sort(
      (a, b) =>
        dayStatusRank(a, selectedDate) - dayStatusRank(b, selectedDate),
    );
  const featuredCommitment = selectedDayCommitments[0] ?? null;
  const secondarySelectedCommitments = selectedDayCommitments.slice(1);
  const selectedDateHasCommitment = confirmedCommitments.some((c) =>
    commitmentIsVisibleForDate(c, selectedDate),
  );
  const calendarCommitment =
    featuredCommitment ??
    confirmedCommitments.find(
      (c) => selectedDate >= c.startDate && selectedDate <= c.endDate,
    ) ??
    confirmedCommitments.find(isActive) ??
    confirmedCommitments[0] ??
    null;
  const selectedDayText = dateLabel(selectedDate);
  const hasSelectedDayView =
    pendingPaymentCommitments.length > 0 || selectedDayCommitments.length > 0;

  useEffect(() => {
    if (!dateStrip.includes(selectedDate) && !selectedDateHasCommitment) {
      setDateDirection(today > selectedDate ? 1 : -1);
      setSelectedDate(today);
    }
  }, [dateStripKey, selectedDate, selectedDateHasCommitment, today]);

  const firstName = useFirstName();
  const earnedCurrency =
    confirmedCommitments.find((c) => c.currency)?.currency ?? "INR";
  const earnedBackLabel = formatCurrency(earnedBack, earnedCurrency);

  const pendingDraftStatus: CommitmentCardStatus = {
    label: "Setup",
    icon: "lock",
    color: colors.accent,
    backgroundColor: colors.accent + "14",
    borderColor: colors.accent + "33",
  };

  const dateIndicatorFrame = useCallback((layout: LayoutRectangle) => {
    const size = 34;
    return {
      x: layout.x + (layout.width - size) / 2,
      y: layout.y,
      width: size,
      height: size,
    };
  }, []);

  const updateDateLayout = useCallback(
    (date: string, layout: LayoutRectangle) => {
      setDateLayouts((current) => {
        if (layoutsMatch(current[date], layout)) return current;
        return { ...current, [date]: layout };
      });
    },
    [],
  );

  function openCheckIn(commitment: Commitment) {
    setSelectedCommitment(commitment);
    setModalVisible(true);
  }

  function openDetails(commitment: Commitment) {
    router.push(`/commitment/${commitment.id}`);
  }

  function startDeposit(commitment: Commitment) {
    void payDeposit(commitment.id as Id<"commitments">);
  }

  function homeActionFor(commitment: Commitment): CommitmentCardAction {
    const availableSlots = slotSummary?.available ?? 0;

    if (isDraft(commitment)) {
      if (availableSlots > 0) {
        return {
          label: paying ? "Opening payment..." : "Deposit money",
          icon: "lock",
          disabled: paying,
          onPress: () => startDeposit(commitment),
        };
      }
      return {
        label: paying ? "Opening payment..." : "Buy Pact Pass",
        icon: "credit-card",
        disabled: paying,
        onPress: () => {
          void buySlot();
        },
      };
    }

    if (isPendingDeposit(commitment)) {
      return {
        label: paying ? "Opening payment..." : "Deposit money",
        icon: "lock",
        disabled: paying,
        onPress: () => startDeposit(commitment),
      };
    }

    if (isNotStarted(commitment)) {
      return {
        label: "Start",
        icon: "play",
        onPress: () => openDetails(commitment),
      };
    }

    if (isActive(commitment)) {
      if (isTodayScheduled(commitment) && !hasTodayCheckIn(commitment)) {
        return {
          label: "Submit proof",
          icon: commitment.goalType === "content" ? "link" : "activity",
          onPress: () => openCheckIn(commitment),
        };
      }

      if (isTodayScheduled(commitment)) {
        const todayCheckIn = getCheckInForDate(commitment, today);
        const todayStatus = getCheckInStatus(todayCheckIn);
        return {
          label: todayStatus === "approved" ? "View record" : "View proof",
          icon: todayStatus === "approved" ? "check-circle" : "clock",
          onPress: () => openDetails(commitment),
        };
      }

      return {
        label: formatComeBackLabel(getNextScheduledDate(commitment)),
        icon: "calendar",
        disabled: true,
        muted: true,
      };
    }

    return {
      label: "Start",
      icon: "play",
      onPress: () => openDetails(commitment),
    };
  }

  function statusFor(commitment: Commitment) {
    return dayStatusFor(commitment, selectedDate, colors);
  }

  function actionFor(commitment: Commitment) {
    return homeActionFor(commitment);
  }

  function showDate(date: string) {
    if (date === selectedDate) return;
    setDateDirection(date > selectedDate ? 1 : -1);
    setSelectedDate(date);
    void Haptics.selectionAsync();
  }

  function selectToday() {
    showDate(today);
  }

  function selectedDateIsToday() {
    return selectedDate === today;
  }

  function selectedDayEmptyTitle() {
    if (selectedDateIsToday()) return "No pact on the record today";
    return `No pact on ${selectedDayText}`;
  }

  function selectedDayEmptyBody() {
    if (selectedDateIsToday()) return "Start with one pact.";
    return "The Raven has nothing to record for this day.";
  }

  function selectedDayHeader() {
    if (selectedDateIsToday()) return "Today";
    return selectedDayText;
  }

  function selectedDaySubhead() {
    const count =
      selectedDayCommitments.length + pendingPaymentCommitments.length;
    if (count === 0) return "No pact status";
    if (count === 1) return "1 pact status";
    return `${count} pact statuses`;
  }

  function selectedDayAccessibilityLabel(date: string) {
    const d = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return date === today ? `Select today, ${d}` : `Select ${d}`;
  }

  function selectedDayColor(date: string) {
    if (date > today) return colors.mutedForeground;
    return colors.foreground;
  }

  function selectedDayCircleBorder(date: string) {
    if (date === selectedDate) return colors.foreground;
    if (date <= today) return colors.mutedForeground + "88";
    return "transparent";
  }

  function selectedDayCircleBackground(date: string) {
    if (date === selectedDate) return colors.card;
    return "transparent";
  }

  function selectedDayDateColor(date: string) {
    if (date === selectedDate) return colors.foreground;
    if (date > today) return colors.mutedForeground + "99";
    return colors.foreground;
  }

  function selectedDayWeight(date: string) {
    return date === selectedDate ? "Inter_700Bold" : "Inter_500Medium";
  }

  function selectedDayCircleStyle(date: string) {
    if (date === selectedDate) {
      return {
        borderColor: "transparent",
        backgroundColor: "transparent",
        borderWidth: 0,
      };
    }
    return {
      borderColor: selectedDayCircleBorder(date),
      backgroundColor: selectedDayCircleBackground(date),
      borderWidth: date <= today || date === selectedDate ? 1.5 : 0,
    };
  }

  function selectedDayDateStyle(date: string) {
    return {
      color: selectedDayDateColor(date),
      fontFamily: selectedDayWeight(date),
    };
  }

  function selectedDayInitialStyle(date: string) {
    return {
      color: selectedDayColor(date),
      fontFamily: selectedDayWeight(date),
    };
  }

  function toggleCycleCalendar() {
    if (!calendarCommitment) return;
    setCycleCalendarOpen((current) => !current);
    void Haptics.selectionAsync();
  }

  useEffect(() => {
    if (selectedDate === addDays(today, -1)) {
      setDateDirection(1);
      setSelectedDate(today);
    }
  }, [selectedDate, today]);

  function handleSubmitContent(
    id: string,
    date: string,
    url: string,
    submissionSignature?: string,
    submissionStatement?: string,
  ) {
    submitContentCheckIn(
      id,
      date,
      url,
      submissionSignature,
      submissionStatement,
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  }

  function handleSubmitWorkout(
    id: string,
    date: string,
    proofStorageId: string,
    proofPrompt: string,
    proofLocation: ProofLocation,
    submissionSignature?: string,
    submissionStatement?: string,
  ) {
    submitWorkoutCheckIn(
      id,
      date,
      proofStorageId,
      proofPrompt,
      proofLocation,
      submissionSignature,
      submissionStatement,
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  }

  const topPadding = Platform.OS === "web" ? 12 : insets.top;
  const isUrgent = countdown < 3600000;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrutalistBackdrop />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPadding + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.homeTop}>
          <View style={styles.brandRow}>
            <View style={styles.brandLeft}>
              <LinearGradient
                colors={[colors.primary, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.brandMark}
              >
                <RavenMark size={23} color={colors.primaryForeground} />
              </LinearGradient>
              <Text style={[styles.brandName, { color: colors.foreground }]}>
                Pact Raven
              </Text>
            </View>
            <TouchableOpacity
              onPress={selectToday}
              activeOpacity={0.82}
              style={[
                styles.earnedPill,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Refund credit ${earnedBackLabel}. Select today.`}
            >
              <Feather name="repeat" size={15} color={colors.accent} />
              <Text style={[styles.earnedText, { color: colors.foreground }]}>
                {earnedBackLabel}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateStripWrap}>
            <View style={styles.dateStrip}>
              <SlidingIndicator
                selectedKey={selectedDate}
                layouts={dateLayouts}
                frameForLayout={dateIndicatorFrame}
                style={[
                  styles.selectedDateIndicator,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.foreground,
                  },
                ]}
              />
              {dateStrip.map((date) => (
                <MotionPressable
                  key={date}
                  onLayout={(event) =>
                    updateDateLayout(date, event.nativeEvent.layout)
                  }
                  onPress={() => showDate(date)}
                  pressedOpacity={0.9}
                  style={styles.dateItem}
                  accessibilityRole="button"
                  accessibilityLabel={selectedDayAccessibilityLabel(date)}
                  accessibilityState={{ selected: date === selectedDate }}
                >
                  <View
                    style={[styles.dayCircle, selectedDayCircleStyle(date)]}
                  >
                    <Text
                      style={[
                        styles.dayInitial,
                        selectedDayInitialStyle(date),
                      ]}
                    >
                      {dayInitial(date)}
                    </Text>
                  </View>
                  <Text style={[styles.dayNumber, selectedDayDateStyle(date)]}>
                    {dayNumber(date)}
                  </Text>
                </MotionPressable>
              ))}
            </View>

            {calendarCommitment && (
              <MotionPressable
                onPress={toggleCycleCalendar}
                pressedOpacity={0.88}
                style={[
                  styles.calendarToggle,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  cycleCalendarOpen
                    ? "Hide cycle calendar"
                    : "Show cycle calendar"
                }
                accessibilityState={{ expanded: cycleCalendarOpen }}
              >
                <Feather
                  name={cycleCalendarOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </MotionPressable>
            )}

            <ExpandablePanel
              expanded={cycleCalendarOpen && !!calendarCommitment}
              style={styles.calendarPanel}
            >
              {calendarCommitment && (
                <CompactCycleCalendar
                  commitment={calendarCommitment}
                  selectedDate={selectedDate}
                  onSelectDate={showDate}
                />
              )}
            </ExpandablePanel>
          </View>
        </View>

        <DirectionalSwap
          direction={dateDirection}
          transitionKey={selectedDate}
        >
          {hasSelectedDayView && (
            <View style={styles.selectedDayHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {selectedDayHeader()}
              </Text>
              <Text
                style={[styles.sectionSub, { color: colors.mutedForeground }]}
              >
                {selectedDaySubhead()}
              </Text>
            </View>
          )}

          {pendingPaymentCommitments.length > 0 && (
            <View style={styles.section}>
              {pendingPaymentCommitments.map((c) => (
                <CommitmentCard
                  key={c.id}
                  commitment={c}
                  compact
                  status={pendingDraftStatus}
                  action={actionFor(c)}
                />
              ))}
            </View>
          )}

          {featuredCommitment && (
            <ActiveWidget
              commitment={featuredCommitment}
              selectedDate={selectedDate}
              dayStatus={statusFor(featuredCommitment)}
              countdown={countdown}
              isUrgent={isUrgent}
              colors={colors}
              action={actionFor(featuredCommitment)}
              onViewDetails={() => openDetails(featuredCommitment)}
            />
          )}

          {secondarySelectedCommitments.length > 0 && (
            <View style={styles.section}>
              {secondarySelectedCommitments.map((c) => (
                <CommitmentCard
                  key={c.id}
                  commitment={c}
                  compact
                  status={statusFor(c)}
                  action={actionFor(c)}
                />
              ))}
            </View>
          )}

          {commitments.length > 0 && !hasSelectedDayView && (
            <View
              style={[
                styles.selectedEmpty,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather
                name="calendar"
                size={18}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.emptyTitleSmall, { color: colors.foreground }]}
              >
                {selectedDayEmptyTitle()}
              </Text>
              <Text
                style={[
                  styles.emptyTextSmall,
                  { color: colors.mutedForeground },
                ]}
              >
                {selectedDayEmptyBody()}
              </Text>
            </View>
          )}
        </DirectionalSwap>

        {commitments.length === 0 && (
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="target" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {firstName ? `No pacts yet, ${firstName}` : "No pacts on record"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Start with one pact.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/commitment/new")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.primary, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createBtn}
              >
                <Text style={styles.createBtnText}>Make first pact</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CheckInModal
        visible={modalVisible}
        commitment={selectedCommitment}
        date={today}
        onClose={() => setModalVisible(false)}
        onSubmitContent={handleSubmitContent}
        onSubmitWorkout={handleSubmitWorkout}
      />
    </View>
  );
}
// ── Active commitment widget ───────────────────────────────────────────────
function ActiveWidget({
  commitment,
  selectedDate,
  dayStatus,
  countdown,
  isUrgent,
  colors,
  action,
  onViewDetails,
}: {
  commitment: Commitment;
  selectedDate: string;
  dayStatus: CommitmentCardStatus;
  countdown: number;
  isUrgent: boolean;
  colors: any;
  action: CommitmentCardAction;
  onViewDetails: () => void;
}) {
  const today = getTodayStr();
  const totalDays = getTotalCommittedDays(commitment);
  const verified = getVerifiedCheckIns(commitment).length;
  const hasPending =
    selectedDate === today &&
    isTodayScheduled(commitment) &&
    !hasTodayCheckIn(commitment);
  const progress = totalDays > 0 ? verified / totalDays : 0;
  const totalRefunded = getTotalRefunded(commitment);
  const actionMuted = action.disabled || action.muted;
  const actionFg = actionMuted
    ? colors.mutedForeground
    : colors.primaryForeground;

  return (
    <TouchableOpacity
      onPress={onViewDetails}
      activeOpacity={0.9}
      style={[
        wStyles.card,
        {
          backgroundColor: colors.card,
          borderColor:
            hasPending && isUrgent ? colors.danger + "66" : colors.border,
          borderWidth: hasPending && isUrgent ? 1.5 : 1,
        },
      ]}
    >
      {/* Top row */}
      <View style={wStyles.topRow}>
        <View
          style={[
            wStyles.typeChip,
            {
              backgroundColor:
                commitment.goalType === "content"
                  ? colors.primary + "18"
                  : colors.accent + "18",
            },
          ]}
        >
          <Feather
            name={commitment.goalType === "content" ? "video" : "activity"}
            size={11}
            color={
              commitment.goalType === "content" ? colors.primary : colors.accent
            }
          />
          <Text
            style={[
              wStyles.typeChipTxt,
              {
                color:
                  commitment.goalType === "content"
                    ? colors.primary
                    : colors.accent,
              },
            ]}
          >
            {commitment.goalType === "content" ? "Content" : "Workout"}
          </Text>
        </View>
        <View style={wStyles.topRight}>
          {hasPending && isUrgent ? (
            <Text
              style={[wStyles.countdown, { color: colors.danger }]}
              numberOfLines={1}
            >
              {formatCountdown(countdown)}
            </Text>
          ) : (
            <View
              style={[
                wStyles.dayStatus,
                {
                  backgroundColor: dayStatus.backgroundColor,
                  borderColor: dayStatus.borderColor ?? dayStatus.backgroundColor,
                },
              ]}
            >
              <Feather
                name={dayStatus.icon as any}
                size={11}
                color={dayStatus.color}
              />
              <Text
                style={[wStyles.dayStatusText, { color: dayStatus.color }]}
                numberOfLines={1}
              >
                {dayStatus.label}
              </Text>
            </View>
          )}
          <Feather
            name="chevron-right"
            size={14}
            color={colors.mutedForeground}
          />
        </View>
      </View>

      {/* Name */}
      <Text
        style={[wStyles.name, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {commitment.name}
      </Text>

      {/* Progress */}
      <View style={[wStyles.progressBg, { backgroundColor: colors.border }]}>
        <LinearGradient
          colors={[colors.primary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            wStyles.progressFill,
            { width: `${Math.min(progress * 100, 100)}%` as any },
          ]}
        />
      </View>

      {/* Stats row */}
      <View style={wStyles.statsRow}>
        <View style={wStyles.stat}>
          <Text style={[wStyles.statVal, { color: colors.primary }]}>
            {formatCurrency(totalRefunded, commitment.currency)}
          </Text>
          <Text style={[wStyles.statLabel, { color: colors.mutedForeground }]}>
            refund credit
          </Text>
        </View>
        <View style={wStyles.statDivider} />
        <View style={wStyles.stat}>
          <Text style={[wStyles.statVal, { color: colors.foreground }]}>
            {verified}/{totalDays}
          </Text>
          <Text style={[wStyles.statLabel, { color: colors.mutedForeground }]}>
            successful days
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={wStyles.actions}>
        {action.disabled ? (
          <View
            style={[
              wStyles.actionBtn,
              {
                flex: 1,
                backgroundColor: colors.secondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather name={action.icon as any} size={15} color={actionFg} />
            <Text
              style={[wStyles.actionTxt, { color: actionFg }]}
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              action.onPress?.();
            }}
            activeOpacity={0.85}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={
                actionMuted
                  ? ([colors.secondary, colors.secondary] as [string, string])
                  : ([colors.primary, colors.primary] as [string, string])
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                wStyles.actionBtn,
                {
                  flex: 1,
                  borderColor: actionMuted ? colors.border : colors.primary,
                },
              ]}
            >
              <Feather name={action.icon as any} size={15} color={actionFg} />
              <Text
                style={[wStyles.actionTxt, { color: actionFg }]}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const wStyles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeChipTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  topRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  countdown: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dayStatus: {
    minHeight: 25,
    maxWidth: 150,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dayStatusText: {
    flexShrink: 1,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  name: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 24 },
  progressBg: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 28, backgroundColor: "#222230" },
  actions: { flexDirection: "row", gap: 8, marginTop: 2 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionTxt: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  homeTop: {
    gap: 18,
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexShrink: 1,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    flexShrink: 1,
  },
  earnedPill: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexShrink: 0,
  },
  earnedText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  dateStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    position: "relative",
  },
  dateStripWrap: {
    gap: 4,
  },
  dateItem: {
    width: 42,
    alignItems: "center",
    gap: 5,
    zIndex: 1,
  },
  selectedDateIndicator: {
    borderRadius: 17,
    borderWidth: 1.5,
    zIndex: 0,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  dayInitial: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  dayNumber: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  calendarToggle: {
    alignSelf: "center",
    width: 34,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  calendarPanel: {
    marginTop: 4,
  },
  selectedDayHeader: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  selectedEmpty: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    alignItems: "flex-start",
    gap: 8,
  },
  emptyTitleSmall: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  emptyTextSmall: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  createBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
