import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useQuery } from "convex/react";

import { useCurrentUser, useFirstName } from "@/hooks/useCurrentUser";
import {
  Alert,
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
import { CommitmentCard } from "@/components/CommitmentCard";
import type { CommitmentCardAction } from "@/components/CommitmentCard";
import { NotificationButton } from "@/components/NotificationButton";
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
  formatDate,
  getCheckInForDate,
  getCheckInStatus,
  getDaysRemaining,
  getMsUntilDeadline,
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
        "Pact slot ready",
        "Now lock the refundable deposit on one draft to start.",
      ),
    onDepositSuccess: () => Alert.alert("Deposit locked", "Your pact is live."),
  });

  const [selectedCommitment, setSelectedCommitment] =
    useState<Commitment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(getMsUntilDeadline());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getMsUntilDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const today = getTodayStr();
  const activeCommitments = commitments.filter(isActive);
  const notStartedCommitments = commitments.filter(isNotStarted);
  const pendingPaymentCommitments = commitments.filter(isPendingPayment);
  const todayPending = activeCommitments.filter(
    (c) => isTodayScheduled(c) && !hasTodayCheckIn(c),
  );
  const todayDone = activeCommitments.filter(
    (c) => isTodayScheduled(c) && hasTodayCheckIn(c),
  );
  const todayNotScheduled = activeCommitments.filter(
    (c) => !isTodayScheduled(c),
  );

  const currentUser = useCurrentUser();
  const displayName = currentUser?.displayName?.trim();
  const firstName = useFirstName();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // The "featured" commitment — pending today first, otherwise live/upcoming.
  const featuredCommitment =
    todayPending[0] ?? activeCommitments[0] ?? notStartedCommitments[0] ?? null;
  const secondaryTodayPending = todayPending.filter(
    (c) => c.id !== featuredCommitment?.id,
  );
  const secondaryTodayDone = todayDone.filter(
    (c) => c.id !== featuredCommitment?.id,
  );
  const secondaryTodayNotScheduled = todayNotScheduled.filter(
    (c) => c.id !== featuredCommitment?.id,
  );
  const secondaryNotStarted = notStartedCommitments.filter(
    (c) => c.id !== featuredCommitment?.id,
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
        label: paying ? "Opening payment..." : "Buy slot",
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
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {greeting}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {displayName ?? "Welcome"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <NotificationButton />
            <TouchableOpacity
              onPress={() => router.push("/commitment/new")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create pact"
            >
              <LinearGradient
                colors={[colors.primary, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addBtn}
              >
                <Feather
                  name="plus"
                  size={20}
                  color={colors.primaryForeground}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {pendingPaymentCommitments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Draft pacts
            </Text>
            <Text
              style={[styles.sectionSub, { color: colors.mutedForeground }]}
            >
              Open a draft pact to buy a slot, lock the deposit, and start.
            </Text>
            {pendingPaymentCommitments.map((c) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                compact
                action={homeActionFor(c)}
              />
            ))}
          </View>
        )}

        {/* ── BIG ACTIVE COMMITMENT WIDGET ── */}
        {featuredCommitment && (
          <ActiveWidget
            commitment={featuredCommitment}
            countdown={countdown}
            isUrgent={isUrgent}
            colors={colors}
            action={homeActionFor(featuredCommitment)}
            onViewDetails={() => openDetails(featuredCommitment)}
          />
        )}

        {/* Today pending (excluding the featured one shown in widget) */}
        {secondaryTodayPending.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Also due today
            </Text>
            {secondaryTodayPending.map((c) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                onCheckIn={openCheckIn}
                action={homeActionFor(c)}
              />
            ))}
          </View>
        )}

        {/* Successful today */}
        {secondaryTodayDone.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              In the record today
            </Text>
            <Text style={[styles.sectionSub, { color: colors.primary }]}>
              {secondaryTodayDone.length} signed
            </Text>
            {secondaryTodayDone.map((c) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                compact
                action={homeActionFor(c)}
              />
            ))}
          </View>
        )}

        {secondaryNotStarted.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Not started
            </Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              First proof starts the record.
            </Text>
            {secondaryNotStarted.map((c) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                compact
                action={homeActionFor(c)}
              />
            ))}
          </View>
        )}

        {/* Rest days */}
        {secondaryTodayNotScheduled.length > 0 && todayPending.length === 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Rest day
            </Text>
            <Text
              style={[styles.sectionSub, { color: colors.mutedForeground }]}
            >
              These pacts do not judge today.
            </Text>
            {secondaryTodayNotScheduled.map((c) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                compact
                action={homeActionFor(c)}
              />
            ))}
          </View>
        )}

        {/* Empty state */}
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
  countdown,
  isUrgent,
  colors,
  action,
  onViewDetails,
}: {
  commitment: Commitment;
  countdown: number;
  isUrgent: boolean;
  colors: any;
  action: CommitmentCardAction;
  onViewDetails: () => void;
}) {
  const today = getTodayStr();
  const totalDays = getTotalCommittedDays(commitment);
  const verified = getVerifiedCheckIns(commitment).length;
  const daysLeft = getDaysRemaining(commitment);
  const hasPending =
    isTodayScheduled(commitment) && !hasTodayCheckIn(commitment);
  const todayCheckIn = getCheckInForDate(commitment, today);
  const todayStatus = getCheckInStatus(todayCheckIn);
  const progress = totalDays > 0 ? verified / totalDays : 0;
  const totalRefunded = getTotalRefunded(commitment);
  const notStarted = isNotStarted(commitment);
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
          {hasPending ? (
            <View style={wStyles.countdownRow}>
              <Feather
                name="clock"
                size={11}
                color={isUrgent ? colors.danger : colors.mutedForeground}
              />
              <Text
                style={[
                  wStyles.countdown,
                  { color: isUrgent ? colors.danger : colors.mutedForeground },
                ]}
              >
                {formatCountdown(countdown)}
              </Text>
            </View>
          ) : notStarted ? (
            <Text
              style={[wStyles.countdown, { color: colors.mutedForeground }]}
            >
              Starts {formatDate(commitment.startDate)}
            </Text>
          ) : todayStatus === "under_review" ? (
            <View style={wStyles.countdownRow}>
              <Feather name="clock" size={11} color={colors.accent} />
              <Text style={[wStyles.countdown, { color: colors.accent }]}>
                With the Raven
              </Text>
            </View>
          ) : todayStatus === "approved" ? (
            <View style={wStyles.countdownRow}>
              <Feather name="check-circle" size={11} color={colors.primary} />
              <Text style={[wStyles.countdown, { color: colors.primary }]}>
                Successful today
              </Text>
            </View>
          ) : (
            <Text
              style={[wStyles.countdown, { color: colors.mutedForeground }]}
            >
              {daysLeft}d left
            </Text>
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
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  countdown: { fontSize: 12, fontFamily: "Inter_500Medium" },
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
