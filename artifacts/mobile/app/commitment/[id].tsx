import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "convex/react";

import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { BrutalistBackdrop } from "@/components/BrutalistBackdrop";
import { CheckInModal } from "@/components/CheckInModal";
import { CommitmentTimeline } from "@/components/CommitmentTimeline";
import { MonthCalendar } from "@/components/MonthCalendar";
import { charityName } from "@/constants/charities";
import { LEGAL_URLS } from "@/constants/links";
import {
  Commitment,
  ProofLocation,
  useCommitments,
} from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import {
  formatCurrency,
  formatDate,
  formatDaysOfWeek,
  getAmountAtRisk,
  getCheckInForDate,
  getCheckInStatus,
  getDaysRemaining,
  getMissedDates,
  getRefundPerDay,
  getScheduledDates,
  getSuccessRate,
  getTodayStr,
  getTotalCommittedDays,
  getTotalRefunded,
  getVerifiedCheckIns,
  hasTodayCheckIn,
  isActive,
  isDraft,
  isEnded,
  isExpired,
  isPendingDeposit,
  isPendingPayment,
  isTodayScheduled,
} from "@/utils/commitment";

const PACT_SLOT_AMOUNT = 249;

export default function CommitmentDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getCommitment,
    submitContentCheckIn,
    submitWorkoutCheckIn,
    removeCheckIn,
    deleteCommitment,
  } = useCommitments();
  const slotSummary = useQuery(api.payments.slotSummary);
  const endEarlyMutation = useMutation(api.commitments.endEarly);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const commitment = getCommitment(id ?? "");
  const today = getTodayStr();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (!commitment) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.headerBar,
            { paddingTop: topPadding + 8, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text
            style={[styles.notFoundText, { color: colors.mutedForeground }]}
          >
            Commitment not found
          </Text>
        </View>
      </View>
    );
  }

  const refunded = getTotalRefunded(commitment);
  const perDay = getRefundPerDay(commitment);
  const totalDays = getTotalCommittedDays(commitment);
  const verified = getVerifiedCheckIns(commitment).length;
  const missed = getMissedDates(commitment).length;
  const missedAmount = missed * perDay;
  const rate = getSuccessRate(commitment);
  const daysLeft = getDaysRemaining(commitment);
  const active = isActive(commitment);
  const expired = isExpired(commitment);
  const pendingPayment = isPendingPayment(commitment);
  const draft = isDraft(commitment);
  const pendingDeposit = isPendingDeposit(commitment);
  const ended = isEnded(commitment);
  const showOperationalDetails = !pendingPayment;
  const todayScheduled = isTodayScheduled(commitment);
  const checkedToday = hasTodayCheckIn(commitment);
  const todayCheckIn = getCheckInForDate(commitment, today);
  const todayStatus = getCheckInStatus(todayCheckIn);
  const forfeitLabel = charityName(commitment.forfeitDestination);

  // Upcoming scheduled dates (today + future, not yet submitted)
  const scheduledDates = getScheduledDates(commitment);
  const upcomingDates = showOperationalDetails
    ? scheduledDates.filter((d) => d >= today)
    : [];

  async function deleteCurrentPact() {
    if (!commitment || deleting) return;
    setDeleting(true);
    try {
      await deleteCommitment(commitment.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.back();
    } catch (error) {
      setDeleting(false);
      Alert.alert(
        "Could not delete pact",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  function handleDelete() {
    const title = draft ? "Delete draft pact?" : "Delete pact setup?";
    const message =
      "This removes the pact before it starts. This cannot be undone.";

    if (Platform.OS === "web") {
      const confirmed =
        typeof globalThis.confirm !== "function" ||
        globalThis.confirm(`${title}\n\n${message}`);
      if (confirmed) void deleteCurrentPact();
      return;
    }

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteCurrentPact();
        },
      },
    ]);
  }

  function handleEndEarly() {
    Alert.alert(
      "End this pact?",
      "The pact slot will stay used. The remaining deposit will go to admin settlement review.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End pact",
          style: "destructive",
          onPress: () => {
            void endEarlyMutation({
              id: commitment!.id as Id<"commitments">,
              reason: "Ended by user",
            })
              .then(() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                );
              })
              .catch((error) =>
                Alert.alert(
                  "Could not end pact",
                  error instanceof Error ? error.message : "Please try again.",
                ),
              );
          },
        },
      ],
    );
  }

  function handleSubmitContent(
    cId: string,
    date: string,
    url: string,
    submissionSignature?: string,
    submissionStatement?: string,
  ) {
    submitContentCheckIn(
      cId,
      date,
      url,
      submissionSignature,
      submissionStatement,
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleSubmitWorkout(
    cId: string,
    date: string,
    proofStorageId: string,
    proofPrompt: string,
    proofLocation: ProofLocation,
    submissionSignature?: string,
    submissionStatement?: string,
  ) {
    submitWorkoutCheckIn(
      cId,
      date,
      proofStorageId,
      proofPrompt,
      proofLocation,
      submissionSignature,
      submissionStatement,
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleUndoToday() {
    removeCheckIn(commitment!.id, today);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrutalistBackdrop />
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          { paddingTop: topPadding + 8, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {commitment.name}
        </Text>
        {pendingPayment ? (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={[styles.iconBtn, deleting && { opacity: 0.45 }]}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={18} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === "web" ? 60 : insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Horizontal date timeline ── */}
        {showOperationalDetails && (
          <View
            style={[
              styles.timelineCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.timelineHeader}>
              <Text style={[styles.timelineTitle, { color: colors.foreground }]}>
                Pact record
              </Text>
              <View style={styles.timelineLegend}>
                <LegendDot color={colors.primary} label="Done" colors={colors} />
                <LegendDot
                  color={colors.danger}
                  label="Missed"
                  colors={colors}
                />
                <LegendDot color={colors.accent} label="Today" colors={colors} />
              </View>
            </View>
            <CommitmentTimeline commitment={commitment} />
            <View style={styles.dateRangeRow}>
              <Text
                style={[styles.dateRangeTxt, { color: colors.mutedForeground }]}
              >
                {formatDate(commitment.startDate)}
              </Text>
              <Text
                style={[styles.dateRangeTxt, { color: colors.mutedForeground }]}
              >
                → {formatDate(commitment.endDate)}
              </Text>
            </View>
          </View>
        )}

        {/* ── Status badge ── */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: active
                  ? colors.primary + "22"
                  : pendingPayment
                    ? colors.accent + "22"
                    : colors.secondary,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: active
                    ? colors.primary
                    : pendingPayment
                      ? colors.accent
                      : colors.mutedForeground,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: pendingPayment
                    ? colors.accent
                    : active
                      ? colors.primary
                      : colors.mutedForeground,
                },
              ]}
            >
              {pendingPayment
                ? draft
                  ? "Draft"
                  : "Deposit not locked"
                : expired
                  ? "Closed"
                  : ended
                    ? "Ended"
                    : active
                      ? "Live"
                      : "Upcoming"}
            </Text>
          </View>
          <Text style={[styles.daysLeftTxt, { color: colors.mutedForeground }]}>
            {pendingPayment
              ? pendingDeposit
                ? "Lock the deposit to start"
                : "Buy a slot, then lock the deposit"
              : expired
                ? `${rate}% success`
                : ended
                  ? "Settlement review"
                  : active
                    ? `${daysLeft} days left`
                    : `Starts ${formatDate(commitment.startDate)}`}
          </Text>
        </View>

        {pendingPayment && (
          <PaymentSetupCard
            commitment={commitment}
            availableSlots={slotSummary?.available ?? 0}
            pendingPurchases={slotSummary?.pendingPurchases ?? 0}
            colors={colors}
          />
        )}

        {/* ── Refund card ── */}
        {showOperationalDetails && (
          <View
            style={[
              styles.refundCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.refundLabel, { color: colors.mutedForeground }]}>
              Refund credit unlocked
            </Text>
            <Text style={[styles.refundValue, { color: colors.primary }]}>
              {formatCurrency(refunded, commitment.currency)}
            </Text>
            <Text style={[styles.refundOf, { color: colors.mutedForeground }]}>
              of {formatCurrency(commitment.pactAmount, commitment.currency)}{" "}
              committed
            </Text>
            <View
              style={[styles.progressBg, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      totalDays > 0
                        ? Math.min((verified / totalDays) * 100, 100)
                        : 0
                    }%` as any,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCol
                value={`${verified}/${totalDays}`}
                label="Days done"
                colors={colors}
              />
              <StatCol
                value={formatCurrency(perDay, commitment.currency)}
                label="Per day"
                colors={colors}
                valueColor={colors.primary}
              />
              <StatCol
                value={expired ? `${rate}%` : `${daysLeft}d left`}
                label={expired ? "Success" : "Remaining"}
                colors={colors}
                valueColor={
                  expired
                    ? rate >= 70
                      ? colors.primary
                      : colors.accent
                    : colors.foreground
                }
              />
            </View>
          </View>
        )}

        {/* ── Missed banner ── */}
        {showOperationalDetails && missed > 0 && (
          <View
            style={[
              styles.missedBanner,
              {
                backgroundColor: colors.danger + "11",
                borderColor: colors.danger + "33",
              },
            ]}
          >
            <Feather name="alert-circle" size={14} color={colors.danger} />
            <Text style={[styles.missedText, { color: colors.danger }]}>
              {missed} missed day{missed > 1 ? "s" : ""} ·{" "}
              {formatCurrency(missedAmount, commitment.currency)} forfeited to{" "}
              {forfeitLabel}
            </Text>
          </View>
        )}

        {/* ── Upcoming check-in slots ── */}
        {upcomingDates.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Next proof slots
            </Text>
            <View
              style={[
                styles.upcomingCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {upcomingDates.slice(0, 6).map((date, idx) => {
                const isLast = idx === upcomingDates.slice(0, 6).length - 1;
                const isDateToday = date === today;
                const d = new Date(date + "T00:00:00");
                const checkIn = getCheckInForDate(commitment, date);
                const checkInStatus = getCheckInStatus(checkIn);
                return (
                  <View key={date}>
                    <View style={styles.upcomingRow}>
                      <View
                        style={[
                          styles.upcomingDot,
                          {
                            backgroundColor:
                              checkInStatus === "approved"
                                ? colors.primary
                                : checkInStatus === "under_review"
                                  ? colors.accent
                                  : isDateToday
                                    ? colors.accent
                                    : colors.border,
                          },
                        ]}
                      >
                        {checkInStatus === "approved" && (
                          <Feather name="check" size={10} color="#000" />
                        )}
                        {checkInStatus === "under_review" && (
                          <Feather name="clock" size={9} color="#000" />
                        )}
                      </View>
                      <View style={styles.upcomingInfo}>
                        <Text
                          style={[
                            styles.upcomingDate,
                            {
                              color: isDateToday
                                ? colors.accent
                                : colors.foreground,
                              fontFamily: isDateToday
                                ? "Inter_600SemiBold"
                                : "Inter_400Regular",
                            },
                          ]}
                        >
                          {isDateToday
                            ? "Today"
                            : d.toLocaleDateString("en-IN", {
                                weekday: "long",
                                day: "numeric",
                                month: "short",
                              })}
                        </Text>
                        <Text
                          style={[
                            styles.upcomingDeadline,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Due by 11:59 PM ·{" "}
                          {commitment.goalType === "content"
                            ? "Post public link"
                            : "Show camera proof"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.upcomingRefund,
                          { color: colors.primary },
                        ]}
                      >
                        {formatCurrency(perDay, commitment.currency)}
                      </Text>
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.upcomingDiv,
                          { backgroundColor: colors.border },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
              {upcomingDates.length > 6 && (
                <Text
                  style={[styles.moreSlots, { color: colors.mutedForeground }]}
                >
                  + {upcomingDates.length - 6} more slots
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Goal info ── */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <InfoRow
            icon={commitment.goalType === "content" ? "video" : "activity"}
            label="Type"
            value={
              commitment.goalType === "content" ? "Content Posting" : "Workout"
            }
            colors={colors}
          />
          <View
            style={[styles.infoDivider, { backgroundColor: colors.border }]}
          />
          <InfoRow
            icon="calendar"
            label="Schedule"
            value={formatDaysOfWeek(commitment.daysOfWeek)}
            colors={colors}
          />
          <View
            style={[styles.infoDivider, { backgroundColor: colors.border }]}
          />
          <InfoRow
            icon="target"
            label="Daily target"
            value={
              commitment.goalType === "content"
                ? `${commitment.targetPerDay} post${
                    commitment.targetPerDay > 1 ? "s" : ""
                  } + public link`
                : "Fresh workout proof with gesture prompt"
            }
            colors={colors}
          />
          <View
            style={[styles.infoDivider, { backgroundColor: colors.border }]}
          />
          <InfoRow
            icon="link"
            label="Proof required"
            value={
              commitment.goalType === "content"
                ? "Public post URL by 11:59 PM"
                : "Camera proof with on-screen prompt by 11:59 PM"
            }
            colors={colors}
          />
        </View>

        {/* ── Calendar ── */}
        {showOperationalDetails && (
          <View
            style={[
              styles.calendarCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <MonthCalendar commitment={commitment} />
          </View>
        )}

        {/* ── Recent check-ins ── */}
        {showOperationalDetails && commitment.checkIns.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent record
            </Text>
            {[...commitment.checkIns]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((ci) => {
                const status = getCheckInStatus(ci);
                return (
                  <View
                    key={ci.id}
                    style={[
                      styles.activityRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.activityDot,
                        {
                          backgroundColor:
                            status === "approved"
                              ? colors.primary
                              : status === "under_review"
                                ? colors.accent
                                : colors.danger,
                        },
                      ]}
                    />
                    <View style={styles.activityInfo}>
                      <Text
                        style={[
                          styles.activityDate,
                          { color: colors.foreground },
                        ]}
                      >
                        {formatDate(ci.date)}
                      </Text>
                      {ci.proofUrl && (
                        <Text
                          style={[
                            styles.activityMeta,
                            { color: colors.mutedForeground },
                          ]}
                          numberOfLines={1}
                        >
                          {ci.proofUrl}
                        </Text>
                      )}
                      {ci.proofPrompt && (
                        <Text
                          style={[
                            styles.activityMeta,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Prompt: {ci.proofPrompt}
                        </Text>
                      )}
                      {ci.proofLocation && (
                        <Text
                          style={[
                            styles.activityMeta,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Location: {ci.proofLocation.latitude.toFixed(5)},{" "}
                          {ci.proofLocation.longitude.toFixed(5)}
                          {typeof ci.proofLocation.accuracy === "number"
                            ? ` ±${Math.round(ci.proofLocation.accuracy)}m`
                            : ""}
                        </Text>
                      )}
                      {ci.submissionStatement && (
                        <Text
                          style={[
                            styles.activityMeta,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Signed: {ci.submissionStatement}
                        </Text>
                      )}
                      {status === "rejected" && ci.rejectionReason && (
                        <Text
                          style={[
                            styles.activityMeta,
                            { color: colors.danger },
                          ]}
                        >
                          Rejected: {ci.rejectionReason}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.activityAmount,
                        {
                          color:
                            status === "approved"
                              ? colors.primary
                              : status === "under_review"
                                ? colors.accent
                                : colors.mutedForeground,
                        },
                      ]}
                    >
                      {status === "approved"
                        ? `+${formatCurrency(perDay, commitment.currency)}`
                        : status === "under_review"
                          ? "With Raven"
                          : status === "missed"
                            ? "Missed"
                            : "Rejected"}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        <View
          style={[
            styles.charityCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="heart" size={14} color={colors.mutedForeground} />
          <View style={styles.charityInfo}>
            <Text
              style={[styles.charityLabel, { color: colors.mutedForeground }]}
            >
              If the pact breaks
            </Text>
            <Text style={[styles.charityName, { color: colors.foreground }]}>
              {forfeitLabel}
            </Text>
            <Text
              style={[styles.charityMeta, { color: colors.mutedForeground }]}
            >
              The money does not become ours. It goes where you chose.
            </Text>
          </View>
        </View>

        {active && (
          <TouchableOpacity
            onPress={handleEndEarly}
            style={[
              styles.endEarlyCard,
              {
                backgroundColor: colors.danger + "10",
                borderColor: colors.danger + "33",
              },
            ]}
            activeOpacity={0.82}
          >
            <Feather name="slash" size={15} color={colors.danger} />
            <View style={styles.charityInfo}>
              <Text style={[styles.charityLabel, { color: colors.danger }]}>
                End pact early
              </Text>
              <Text
                style={[styles.charityMeta, { color: colors.mutedForeground }]}
              >
                The slot stays used. Admin settles the remaining deposit.
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Action area ── */}
      {active && todayScheduled && (
        <View
          style={[
            styles.fabArea,
            {
              paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12,
              borderTopColor: colors.border,
            },
          ]}
        >
          {checkedToday ? (
            <View style={styles.fabRow}>
              <View
                style={[
                  styles.donePill,
                  {
                    backgroundColor:
                      todayStatus === "approved"
                        ? colors.primary + "22"
                        : colors.accent + "22",
                    borderColor:
                      todayStatus === "approved"
                        ? colors.primary + "44"
                        : colors.accent + "44",
                  },
                ]}
              >
                <Feather
                  name={todayStatus === "approved" ? "check-circle" : "clock"}
                  size={16}
                  color={
                    todayStatus === "approved" ? colors.primary : colors.accent
                  }
                />
                <Text
                  style={[
                    styles.donePillText,
                    {
                      color:
                        todayStatus === "approved"
                          ? colors.primary
                          : colors.accent,
                    },
                  ]}
                >
                  {todayStatus === "approved"
                    ? `Successful · ${formatCurrency(perDay, commitment.currency)} refund credit`
                    : "Proof is with the Raven"}
                </Text>
              </View>
              {todayStatus === "under_review" && (
                <TouchableOpacity
                  onPress={handleUndoToday}
                  style={[
                    styles.undoBtn,
                    { backgroundColor: colors.secondary },
                  ]}
                  activeOpacity={0.75}
                >
                  <Feather
                    name="rotate-ccw"
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={[styles.fab, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Feather
                name={commitment.goalType === "content" ? "link" : "activity"}
                size={18}
                color="#000"
              />
              <Text style={styles.fabText}>
                {commitment.goalType === "content"
                  ? "Submit post link"
                  : "Show workout proof"}{" "}
                · sign
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <CheckInModal
        visible={modalVisible}
        commitment={commitment}
        date={today}
        onClose={() => setModalVisible(false)}
        onSubmitContent={handleSubmitContent}
        onSubmitWorkout={handleSubmitWorkout}
      />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function PaymentSetupCard({
  commitment,
  availableSlots,
  pendingPurchases,
  colors,
}: {
  commitment: Commitment;
  availableSlots: number;
  pendingPurchases: number;
  colors: any;
}) {
  const hasSlot = availableSlots > 0;
  const pendingDeposit = isPendingDeposit(commitment);
  const { buySlot, payDeposit, paying } = useRazorpayCheckout({
    onSlotSuccess: () =>
      Alert.alert(
        "Pact slot ready",
        "Now lock the refundable deposit on this draft to start.",
      ),
    onDepositSuccess: () =>
      Alert.alert("Deposit locked", "Your pact is now live."),
  });
  const startPayment = () => {
    if (!hasSlot) {
      void buySlot();
      return;
    }
    void payDeposit(commitment.id as Id<"commitments">);
  };
  const title = hasSlot ? "Lock the deposit" : "Buy a pact slot";
  const body = hasSlot
    ? "After the deposit succeeds, one slot is consumed and the pact becomes live."
    : "A pact slot costs ₹249, is non-refundable, and unlocks one challenge.";
  const buttonLabel = paying
    ? "Opening payment..."
    : hasSlot
      ? "Pay deposit"
      : "Buy pact slot";

  return (
    <View
      style={[
        styles.paymentCard,
        {
          backgroundColor: colors.accent + "12",
          borderColor: colors.accent + "44",
        },
      ]}
    >
      <View style={styles.paymentTop}>
        <View
          style={[
            styles.paymentIcon,
            { backgroundColor: colors.accent + "18" },
          ]}
        >
          <Feather name="credit-card" size={17} color={colors.accent} />
        </View>
        <View style={styles.paymentCopy}>
          <Text style={[styles.paymentTitle, { color: colors.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.paymentText, { color: colors.mutedForeground }]}>
            {body}
          </Text>
        </View>
      </View>
      <View style={styles.paymentBreakdown}>
        {!hasSlot && (
          <PaymentBreakdownRow
            label="Pact slot fee"
            value={formatCurrency(PACT_SLOT_AMOUNT, commitment.currency)}
            colors={colors}
          />
        )}
        {hasSlot && (
          <PaymentBreakdownRow
            label="Unused pact slots"
            value={String(availableSlots)}
            colors={colors}
          />
        )}
        <PaymentBreakdownRow
          label={hasSlot ? "Deposit to lock" : "Deposit comes next"}
          value={formatCurrency(commitment.pactAmount, commitment.currency)}
          colors={colors}
        />
        <PaymentBreakdownRow
          label={hasSlot ? "Due now" : "Slot due now"}
          value={formatCurrency(
            hasSlot ? commitment.pactAmount : PACT_SLOT_AMOUNT,
            commitment.currency,
          )}
          colors={colors}
          strong
        />
      </View>
      {pendingPurchases > 0 && !hasSlot && (
        <Text style={[styles.paymentMeta, { color: colors.mutedForeground }]}>
          {pendingPurchases} slot payment request is still pending.
        </Text>
      )}
      <TouchableOpacity
        onPress={startPayment}
        disabled={paying}
        style={[
          styles.paymentBtn,
          { backgroundColor: colors.accent, opacity: paying ? 0.55 : 1 },
        ]}
        activeOpacity={0.85}
      >
        <Feather name="credit-card" size={15} color="#000" />
        <Text style={styles.paymentBtnText}>{buttonLabel}</Text>
      </TouchableOpacity>
      <Text style={[styles.paymentMeta, { color: colors.mutedForeground }]}>
        By paying, you accept the{" "}
        <Text
          style={[styles.paymentLink, { color: colors.accent }]}
          onPress={() => void Linking.openURL(LEGAL_URLS.terms)}
        >
          Terms
        </Text>{" "}
        and{" "}
        <Text
          style={[styles.paymentLink, { color: colors.accent }]}
          onPress={() => void Linking.openURL(LEGAL_URLS.payments)}
        >
          Payment policy
        </Text>
        . Ref: {commitment.id}
      </Text>
    </View>
  );
}

function PaymentBreakdownRow({
  label,
  value,
  colors,
  strong,
}: {
  label: string;
  value: string;
  colors: any;
  strong?: boolean;
}) {
  return (
    <View style={styles.paymentBreakdownRow}>
      <Text
        style={[
          styles.paymentBreakdownLabel,
          { color: strong ? colors.foreground : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.paymentBreakdownValue,
          { color: strong ? colors.accent : colors.foreground },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function LegendDot({
  color,
  label,
  colors,
}: {
  color: string;
  label: string;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
      <Text
        style={{
          fontSize: 10,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function StatCol({
  value,
  label,
  colors,
  valueColor,
}: {
  value: string;
  label: string;
  colors: any;
  valueColor?: string;
}) {
  return (
    <View style={scStyles.col}>
      <Text
        style={[scStyles.value, { color: valueColor ?? colors.foreground }]}
      >
        {value}
      </Text>
      <Text style={[scStyles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={irStyles.row}>
      <View style={irStyles.left}>
        <Feather name={icon as any} size={14} color={colors.mutedForeground} />
        <Text style={[irStyles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
      <Text
        style={[irStyles.value, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const scStyles = StyleSheet.create({
  col: { flex: 1, alignItems: "center", gap: 2 },
  value: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  label: { fontSize: 10, fontFamily: "Inter_400Regular" },
});

const irStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 90 },
  label: { fontSize: 12, fontFamily: "Inter_400Regular" },
  value: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    textAlign: "right",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  // Timeline
  timelineCard: {
    borderRadius: 8,
    borderWidth: 1,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timelineTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  timelineLegend: { flexDirection: "row", gap: 10 },
  dateRangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  dateRangeTxt: { fontSize: 10, fontFamily: "Inter_400Regular" },
  // Status
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  daysLeftTxt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  paymentCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  paymentTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  paymentIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCopy: { flex: 1, gap: 4 },
  paymentTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  paymentText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  paymentBreakdown: {
    gap: 8,
  },
  paymentBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  paymentBreakdownLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  paymentBreakdownValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  paymentBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  paymentBtnText: {
    color: "#000",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  paymentMeta: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  paymentLink: { fontFamily: "Inter_700Bold" },
  // Refund card
  refundCard: {
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    gap: 4,
  },
  refundLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  refundValue: { fontSize: 36, fontFamily: "Inter_700Bold", lineHeight: 42 },
  refundOf: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 14 },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: { height: "100%", borderRadius: 3 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  // Missed banner
  missedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  missedText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 17,
  },
  // Upcoming slots
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  upcomingCard: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
  },
  upcomingDot: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  upcomingInfo: { flex: 1, gap: 2 },
  upcomingDate: { fontSize: 13 },
  upcomingDeadline: { fontSize: 10, fontFamily: "Inter_400Regular" },
  upcomingRefund: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 0,
  },
  upcomingDiv: { height: 1, marginLeft: 34 },
  moreSlots: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    paddingTop: 10,
    paddingBottom: 6,
    textAlign: "center",
  },
  // Info card
  infoCard: { borderRadius: 8, padding: 16, borderWidth: 1 },
  infoDivider: { height: 1 },
  // Calendar
  calendarCard: { borderRadius: 8, padding: 16, borderWidth: 1 },
  // Activity
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  activityInfo: { flex: 1, gap: 2 },
  activityDate: { fontSize: 13, fontFamily: "Inter_500Medium" },
  activityMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  activityAmount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  // Charity destination
  charityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  charityInfo: { flex: 1, gap: 2 },
  charityLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  charityName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  charityMeta: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  endEarlyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  // FAB
  fabArea: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  fabRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  donePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  donePillText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  undoBtn: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 8,
  },
  fabText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000" },
});
