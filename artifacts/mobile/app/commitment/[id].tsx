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

import { MonthCalendar } from "@/components/MonthCalendar";
import { useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  formatCurrency,
  formatDate,
  getDaysRemaining,
  getEarningsPerCheckIn,
  getMissedDays,
  getSuccessRate,
  getTodayStr,
  getTotalEarned,
  hasCheckedInToday,
  isActive,
  isExpired,
} from "@/utils/commitment";

export default function CommitmentDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCommitment, checkIn, removeCheckIn, deleteCommitment } =
    useCommitments();

  const commitment = getCommitment(id ?? "");
  const today = getTodayStr();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (!commitment) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { paddingTop: topPadding + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
            Commitment not found
          </Text>
        </View>
      </View>
    );
  }

  const earned = getTotalEarned(commitment);
  const perCheckIn = getEarningsPerCheckIn(commitment);
  const atRisk = commitment.stakeAmount - earned;
  const missedDays = getMissedDays(commitment);
  const missedAmount = missedDays * perCheckIn;
  const successRate = getSuccessRate(commitment);
  const daysLeft = getDaysRemaining(commitment);
  const checkedToday = hasCheckedInToday(commitment);
  const active = isActive(commitment);
  const expired = isExpired(commitment);

  function handleCheckIn() {
    checkIn(commitment!.id, today);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleUndo() {
    removeCheckIn(commitment!.id, today);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleDelete() {
    Alert.alert(
      "Delete commitment",
      "This will permanently remove this stake and all check-in history.",
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {commitment.name}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="trash-2" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === "web" ? 34 + 40 : 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status badge */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: expired
                  ? colors.muted
                  : active
                  ? colors.primary + "22"
                  : colors.muted,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: expired
                    ? colors.mutedForeground
                    : colors.primary,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: expired ? colors.mutedForeground : colors.primary,
                },
              ]}
            >
              {expired ? "Completed" : active ? "Active" : "Upcoming"}
            </Text>
          </View>
          <Text style={[styles.dateRange, { color: colors.mutedForeground }]}>
            {formatDate(commitment.startDate)} – {formatDate(commitment.endDate)}
          </Text>
        </View>

        {/* Main earnings card */}
        <View
          style={[
            styles.earningsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.earningsLabel, { color: colors.mutedForeground }]}>
            Earned back
          </Text>
          <Text style={[styles.earningsValue, { color: colors.primary }]}>
            {formatCurrency(earned, commitment.currency)}
          </Text>
          <Text style={[styles.earningsOf, { color: colors.mutedForeground }]}>
            of {formatCurrency(commitment.stakeAmount, commitment.currency)} staked
          </Text>

          {/* Progress bar */}
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((commitment.checkIns.length / commitment.targetCount) * 100, 100)}%` as any,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>

          <View style={styles.statsRow}>
            <StatCol
              value={`${commitment.checkIns.length}/${commitment.targetCount}`}
              label="Check-ins"
              colors={colors}
            />
            <StatCol
              value={formatCurrency(perCheckIn, commitment.currency)}
              label="Per check-in"
              colors={colors}
              valueColor={colors.primary}
            />
            <StatCol
              value={expired ? `${successRate}%` : `${daysLeft}d left`}
              label={expired ? "Success rate" : "Remaining"}
              colors={colors}
              valueColor={
                expired
                  ? successRate >= 70
                    ? colors.primary
                    : colors.accent
                  : colors.foreground
              }
            />
          </View>
        </View>

        {/* Missed / At risk */}
        {missedDays > 0 && (
          <View
            style={[
              styles.missedCard,
              { backgroundColor: colors.danger + "11", borderColor: colors.danger + "33" },
            ]}
          >
            <Feather name="alert-circle" size={14} color={colors.danger} />
            <Text style={[styles.missedText, { color: colors.danger }]}>
              {missedDays} missed day{missedDays > 1 ? "s" : ""} ·{" "}
              {formatCurrency(missedAmount, commitment.currency)} at risk
              {commitment.friendName ? ` → ${commitment.friendName}` : ""}
            </Text>
          </View>
        )}

        {/* Calendar */}
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <MonthCalendar commitment={commitment} />
        </View>

        {/* Friend info */}
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
                {commitment.friendContact ? ` · ${commitment.friendContact}` : ""}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Check-in FAB */}
      {active && (
        <View
          style={[
            styles.fabArea,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12 },
          ]}
        >
          {checkedToday ? (
            <View style={styles.fabRow}>
              <View
                style={[
                  styles.doneChip,
                  { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" },
                ]}
              >
                <Feather name="check-circle" size={16} color={colors.primary} />
                <Text style={[styles.doneText, { color: colors.primary }]}>
                  Checked in · +{formatCurrency(perCheckIn, commitment.currency)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleUndo}
                style={[styles.undoBtn, { backgroundColor: colors.secondary }]}
                activeOpacity={0.75}
              >
                <Feather name="rotate-ccw" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleCheckIn}
              style={[styles.fab, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Feather name="check" size={20} color="#000" />
              <Text style={styles.fabText}>
                Check in · Earn {formatCurrency(perCheckIn, commitment.currency)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
    <View style={statStyles.col}>
      <Text style={[statStyles.value, { color: valueColor ?? colors.foreground }]}>
        {value}
      </Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  col: { flex: 1, alignItems: "center", gap: 2 },
  value: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  label: { fontSize: 10, fontFamily: "Inter_400Regular" },
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
  backBtn: {
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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
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
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  dateRange: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  earningsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 4,
  },
  earningsLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  earningsValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    lineHeight: 42,
  },
  earningsOf: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  missedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  missedText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  calendarCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  friendInfo: {
    flex: 1,
    gap: 2,
  },
  friendLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  friendName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  fabArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  fabRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  doneChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  doneText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  undoBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  fabText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
