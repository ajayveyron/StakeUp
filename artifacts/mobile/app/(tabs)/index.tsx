import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

import { useCurrentUser, useFirstName } from "@/hooks/useCurrentUser";
import {
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
import { NotificationButton } from "@/components/NotificationButton";
import { Commitment, useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  formatCountdown,
  formatCurrency,
  getCheckInForDate,
  getCheckInStatus,
  getDaysRemaining,
  getMsUntilDeadline,
  getRefundPerDay,
  getTodayStr,
  getTotalCommittedDays,
  getTotalRefunded,
  getVerifiedCheckIns,
  hasTodayCheckIn,
  isActive,
  isPendingPayment,
  isTodayScheduled,
} from "@/utils/commitment";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { commitments, submitContentCheckIn, submitWorkoutCheckIn } =
    useCommitments();

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
  const pendingPaymentCommitments = commitments.filter(isPendingPayment);
  const confirmedCommitments = commitments.filter((c) => !isPendingPayment(c));
  const todayPending = activeCommitments.filter(
    (c) => isTodayScheduled(c) && !hasTodayCheckIn(c)
  );
  const todayDone = activeCommitments.filter(
    (c) => isTodayScheduled(c) && hasTodayCheckIn(c)
  );
  const todayNotScheduled = activeCommitments.filter(
    (c) => !isTodayScheduled(c)
  );

  const totalCommitted = confirmedCommitments.reduce(
    (s, c) => s + c.pactAmount,
    0
  );
  const totalRefunded = confirmedCommitments.reduce(
    (s, c) => s + getTotalRefunded(c),
    0
  );

  const currentUser = useCurrentUser();
  const displayName = currentUser?.displayName?.trim();
  const firstName = useFirstName();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // The "featured" commitment — pending today first, otherwise first active
  const featuredCommitment = todayPending[0] ?? activeCommitments[0] ?? null;

  function openCheckIn(commitment: Commitment) {
    setSelectedCommitment(commitment);
    setModalVisible(true);
  }

  function handleSubmitContent(
    id: string,
    date: string,
    url: string,
    submissionSignature?: string,
    submissionStatement?: string
  ) {
    submitContentCheckIn(
      id,
      date,
      url,
      submissionSignature,
      submissionStatement
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  }

  function handleSubmitWorkout(
    id: string,
    date: string,
    proofUrl: string,
    proofPrompt?: string,
    submissionSignature?: string,
    submissionStatement?: string
  ) {
    submitWorkoutCheckIn(
      id,
      date,
      proofUrl,
      proofPrompt,
      submissionSignature,
      submissionStatement
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
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
            >
              <LinearGradient
                colors={["#FFD800", "#FFD800"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addBtn}
              >
                <Feather name="plus" size={20} color="#000" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary strip */}
        {commitments.length > 0 && (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <SumStat
              value={formatCurrency(totalRefunded)}
              label="Refund credit"
              color={colors.primary}
              colors={colors}
            />
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <SumStat
              value={formatCurrency(totalCommitted - totalRefunded)}
              label="At risk"
              color={colors.accent}
              colors={colors}
            />
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <SumStat
              value={String(todayPending.length)}
              label="Due today"
              color={
                todayPending.length > 0 ? colors.foreground : colors.mutedForeground
              }
              colors={colors}
            />
          </View>
        )}

        {pendingPaymentCommitments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Draft pacts
            </Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              These pacts start after one slot is used and the deposit is locked.
            </Text>
            {pendingPaymentCommitments.map((c) => (
              <CommitmentCard key={c.id} commitment={c} compact />
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
            onCheckIn={() => openCheckIn(featuredCommitment)}
            onViewDetails={() =>
              router.push(`/commitment/${featuredCommitment.id}`)
            }
          />
        )}

        {/* Deadline banner (when there are pending) */}
        {todayPending.length > 0 && (
          <View
            style={[
              styles.deadlineBanner,
              {
                backgroundColor: isUrgent
                  ? colors.danger + "22"
                  : colors.secondary,
                borderColor: isUrgent ? colors.danger + "55" : colors.border,
              },
            ]}
          >
            <Feather
              name="clock"
              size={13}
              color={isUrgent ? colors.danger : colors.mutedForeground}
            />
            <Text
              style={[
                styles.deadlineText,
                { color: isUrgent ? colors.danger : colors.mutedForeground },
              ]}
            >
              The pact closes in {formatCountdown(countdown)} · proof due by 11:59 PM
            </Text>
          </View>
        )}

        {/* Today pending (excluding the featured one shown in widget) */}
        {todayPending.length > 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Also due today
            </Text>
            {todayPending.slice(1).map((c) => (
              <CommitmentCard key={c.id} commitment={c} onCheckIn={openCheckIn} />
            ))}
          </View>
        )}

        {/* Successful today */}
        {todayDone.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              In the record today
            </Text>
            <Text style={[styles.sectionSub, { color: colors.primary }]}>
              {todayDone.length} signed
            </Text>
            {todayDone.map((c) => (
              <CommitmentCard key={c.id} commitment={c} compact />
            ))}
          </View>
        )}

        {/* Rest days */}
        {todayNotScheduled.length > 0 && todayPending.length === 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Rest day
            </Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              These pacts do not judge today.
            </Text>
            {todayNotScheduled.map((c) => (
              <CommitmentCard key={c.id} commitment={c} compact />
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
              Make one you cannot casually ignore. The Raven will record the proof.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/commitment/new")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#FFD800", "#FFD800"]}
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
  onCheckIn,
  onViewDetails,
}: {
  commitment: Commitment;
  countdown: number;
  isUrgent: boolean;
  colors: any;
  onCheckIn: () => void;
  onViewDetails: () => void;
}) {
  const today = getTodayStr();
  const perDay = getRefundPerDay(commitment);
  const totalDays = getTotalCommittedDays(commitment);
  const verified = getVerifiedCheckIns(commitment).length;
  const daysLeft = getDaysRemaining(commitment);
  const hasPending = isTodayScheduled(commitment) && !hasTodayCheckIn(commitment);
  const todayCheckIn = getCheckInForDate(commitment, today);
  const todayStatus = getCheckInStatus(todayCheckIn);
  const progress = totalDays > 0 ? verified / totalDays : 0;
  const totalRefunded = getTotalRefunded(commitment);

  return (
    <TouchableOpacity
      onPress={onViewDetails}
      activeOpacity={0.9}
      style={[
        wStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: hasPending && isUrgent ? colors.danger + "66" : colors.border,
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
            <Text style={[wStyles.countdown, { color: colors.mutedForeground }]}>
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
          colors={["#FFD800", "#FFD800"]}
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
        <View style={wStyles.statDivider} />
        <View style={wStyles.stat}>
          <Text style={[wStyles.statVal, { color: colors.accent }]}>
            {formatCurrency(perDay, commitment.currency)}
          </Text>
          <Text style={[wStyles.statLabel, { color: colors.mutedForeground }]}>
            per day
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={wStyles.actions}>
        {hasPending && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              onCheckIn();
            }}
            activeOpacity={0.85}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={["#FFD800", "#FFD800"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={wStyles.checkInBtn}
            >
              <Feather
                name={commitment.goalType === "content" ? "link" : "activity"}
                size={15}
                color="#000"
              />
              <Text style={wStyles.checkInTxt}>
                {commitment.goalType === "content"
                  ? "Submit post link"
                  : "Show proof"}{" "}
                · sign
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {hasPending ? (
          <TouchableOpacity
            onPress={onViewDetails}
            activeOpacity={0.8}
            style={[wStyles.detailBtn, { backgroundColor: colors.secondary }]}
          >
            <Text style={[wStyles.detailTxt, { color: colors.mutedForeground }]}>
              Details
            </Text>
            <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onViewDetails}
            activeOpacity={0.8}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={["#FFD800", "#FFD800"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[wStyles.detailBtn, { flex: 1 }]}
            >
              <Text style={[wStyles.detailTxt, { color: "#000" }]}>
                View details
              </Text>
              <Feather name="arrow-right" size={14} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SumStat({
  value,
  label,
  color,
  colors,
}: {
  value: string;
  label: string;
  color: string;
  colors: any;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
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
  checkInBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 8,
  },
  checkInTxt: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  detailTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
  summaryCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  summaryStat: { flex: 1, alignItems: "center", gap: 4 },
  summaryValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  summaryDivider: { width: 1, height: 32 },
  deadlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
  },
  deadlineText: { fontSize: 13, fontFamily: "Inter_500Medium" },
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
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", textAlign: "center" },
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
    color: "#000",
  },
});
