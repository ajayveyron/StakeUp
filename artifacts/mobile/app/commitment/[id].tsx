import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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

import { CheckInModal } from "@/components/CheckInModal";
import { CommitmentTimeline } from "@/components/CommitmentTimeline";
import { MonthCalendar } from "@/components/MonthCalendar";
import { useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
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
  isExpired,
  isTodayScheduled,
} from "@/utils/commitment";

export default function CommitmentDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getCommitment,
    submitContentCheckIn,
    submitStepsCheckIn,
    removeCheckIn,
    deleteCommitment,
  } = useCommitments();

  const [modalVisible, setModalVisible] = useState(false);

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
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
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
  const todayScheduled = isTodayScheduled(commitment);
  const checkedToday = hasTodayCheckIn(commitment);
  const todayCheckIn = getCheckInForDate(commitment, today);
  const todayStatus = getCheckInStatus(todayCheckIn);
  const forfeitLabel =
    commitment.friendName && commitment.forfeitDestination !== "reward_pool"
      ? `${commitment.friendName}'s wallet`
      : "the reward pool";

  // Upcoming scheduled dates (today + future, not yet submitted)
  const scheduledDates = getScheduledDates(commitment);
  const upcomingDates = scheduledDates.filter((d) => d >= today);

  function handleDelete() {
    Alert.alert(
      "Delete commitment",
      "This permanently removes all check-in history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteCommitment(commitment!.id);
            router.back();
          },
        },
      ]
    );
  }

  function handleSubmitContent(cId: string, date: string, url: string) {
    submitContentCheckIn(cId, date, url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleSubmitSteps(cId: string, date: string, steps: number) {
    submitStepsCheckIn(cId, date, steps);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleUndoToday() {
    removeCheckIn(commitment!.id, today);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === "web" ? 60 : insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Horizontal date timeline ── */}
        <View
          style={[
            styles.timelineCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.timelineHeader}>
            <Text style={[styles.timelineTitle, { color: colors.foreground }]}>
              Commitment timeline
            </Text>
            <View style={styles.timelineLegend}>
              <LegendDot color={colors.primary} label="Done" colors={colors} />
              <LegendDot color={colors.danger} label="Missed" colors={colors} />
              <LegendDot color={colors.accent} label="Today" colors={colors} />
            </View>
          </View>
          <CommitmentTimeline commitment={commitment} />
          <View style={styles.dateRangeRow}>
            <Text style={[styles.dateRangeTxt, { color: colors.mutedForeground }]}>
              {formatDate(commitment.startDate)}
            </Text>
            <Text style={[styles.dateRangeTxt, { color: colors.mutedForeground }]}>
              → {formatDate(commitment.endDate)}
            </Text>
          </View>
        </View>

        {/* ── Status badge ── */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: active
                  ? colors.primary + "22"
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
                    : colors.mutedForeground,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: active ? colors.primary : colors.mutedForeground },
              ]}
            >
              {expired ? "Completed" : active ? "Active" : "Upcoming"}
            </Text>
          </View>
          <Text style={[styles.daysLeftTxt, { color: colors.mutedForeground }]}>
            {expired
              ? `${rate}% success`
              : active
              ? `${daysLeft} days left`
              : `Starts ${formatDate(commitment.startDate)}`}
          </Text>
        </View>

        {/* ── Refund card ── */}
        <View
          style={[
            styles.refundCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.refundLabel, { color: colors.mutedForeground }]}>
            Refunded
          </Text>
          <Text style={[styles.refundValue, { color: colors.primary }]}>
            {formatCurrency(refunded, commitment.currency)}
          </Text>
          <Text style={[styles.refundOf, { color: colors.mutedForeground }]}>
            of {formatCurrency(commitment.pactAmount, commitment.currency)} committed
          </Text>
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
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

        {/* ── Missed banner ── */}
        {missed > 0 && (
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
              {missed} missed/rejected day{missed > 1 ? "s" : ""} ·{" "}
              {formatCurrency(missedAmount, commitment.currency)} forfeited to{" "}
              {forfeitLabel}
            </Text>
          </View>
        )}

        {/* ── Upcoming check-in slots ── */}
        {upcomingDates.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Upcoming slots
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
                            backgroundColor: checkInStatus === "approved"
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
                          Deadline 11:59 PM ·{" "}
                          {commitment.goalType === "content"
                            ? "Post public link"
                            : `${commitment.targetPerDay.toLocaleString(
                                "en-IN"
                              )} steps`}
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
                  style={[
                    styles.moreSlots,
                    { color: colors.mutedForeground },
                  ]}
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
              commitment.goalType === "content"
                ? "Content Creation"
                : "Step Count"
            }
            colors={colors}
          />
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <InfoRow
            icon="calendar"
            label="Schedule"
            value={formatDaysOfWeek(commitment.daysOfWeek)}
            colors={colors}
          />
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <InfoRow
            icon="target"
            label="Daily target"
            value={
              commitment.goalType === "steps"
                ? `${commitment.targetPerDay.toLocaleString("en-IN")} steps`
                : `${commitment.targetPerDay} post${
                    commitment.targetPerDay > 1 ? "s" : ""
                  } + public link`
            }
            colors={colors}
          />
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <InfoRow
            icon="link"
            label="Proof required"
            value={
              commitment.goalType === "content"
                ? "Public post URL by 11:59 PM"
                : `${commitment.targetPerDay.toLocaleString("en-IN")}+ steps logged by 11:59 PM`
            }
            colors={colors}
          />
        </View>

        {/* ── Calendar ── */}
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <MonthCalendar commitment={commitment} />
        </View>

        {/* ── Recent check-ins ── */}
        {commitment.checkIns.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent activity
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
                      { backgroundColor: colors.card, borderColor: colors.border },
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
                        style={[styles.activityDate, { color: colors.foreground }]}
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
                      {ci.stepCount !== undefined && (
                        <Text
                          style={[
                            styles.activityMeta,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {ci.stepCount.toLocaleString("en-IN")} steps
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
                        ? "Review"
                        : "Rejected"}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* ── Friend ── */}
        {commitment.friendName && (
          <View
            style={[
              styles.friendCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="user" size={14} color={colors.mutedForeground} />
            <View style={styles.friendInfo}>
              <Text style={[styles.friendLabel, { color: colors.mutedForeground }]}>
                Forfeit goes to
              </Text>
              <Text style={[styles.friendName, { color: colors.foreground }]}>
                {commitment.friendName}
                {commitment.friendContact
                  ? ` · ${commitment.friendContact}`
                  : ""}
              </Text>
            </View>
          </View>
        )}

        {!commitment.friendName && commitment.forfeitDestination !== "friend" && (
          <View
            style={[
              styles.friendCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="award" size={14} color={colors.mutedForeground} />
            <View style={styles.friendInfo}>
              <Text style={[styles.friendLabel, { color: colors.mutedForeground }]}>
                Forfeit goes to
              </Text>
              <Text style={[styles.friendName, { color: colors.foreground }]}>
                Reward pool
              </Text>
              <Text style={[styles.friendMeta, { color: colors.mutedForeground }]}>
                Keeps you eligible for reward-pool benefits when program rules are met.
              </Text>
            </View>
          </View>
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
                  color={todayStatus === "approved" ? colors.primary : colors.accent}
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
                    ? `Approved · +${formatCurrency(perDay, commitment.currency)} in wallet`
                    : "Submitted for review"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleUndoToday}
                style={[styles.undoBtn, { backgroundColor: colors.secondary }]}
                activeOpacity={0.75}
              >
                <Feather
                  name="rotate-ccw"
                  size={16}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
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
                  : "Log today's steps"}{" "}
                · review
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
        onSubmitSteps={handleSubmitSteps}
      />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

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
      <Text style={[scStyles.value, { color: valueColor ?? colors.foreground }]}>
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
    borderRadius: 16,
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
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  daysLeftTxt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  // Refund card
  refundCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 4,
  },
  refundLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  refundValue: { fontSize: 36, fontFamily: "Inter_700Bold", lineHeight: 42 },
  refundOf: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 14 },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 16 },
  progressFill: { height: "100%", borderRadius: 3 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  // Missed banner
  missedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
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
    borderRadius: 14,
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
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  upcomingInfo: { flex: 1, gap: 2 },
  upcomingDate: { fontSize: 13 },
  upcomingDeadline: { fontSize: 10, fontFamily: "Inter_400Regular" },
  upcomingRefund: { fontSize: 13, fontFamily: "Inter_600SemiBold", flexShrink: 0 },
  upcomingDiv: { height: 1, marginLeft: 34 },
  moreSlots: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    paddingTop: 10,
    paddingBottom: 6,
    textAlign: "center",
  },
  // Info card
  infoCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  infoDivider: { height: 1 },
  // Calendar
  calendarCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  // Activity
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  activityInfo: { flex: 1, gap: 2 },
  activityDate: { fontSize: 13, fontFamily: "Inter_500Medium" },
  activityMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  activityAmount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  // Friend
  friendCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  friendInfo: { flex: 1, gap: 2 },
  friendLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  friendName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  friendMeta: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
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
    borderRadius: 14,
    borderWidth: 1,
  },
  donePillText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  undoBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  fabText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000" },
});
