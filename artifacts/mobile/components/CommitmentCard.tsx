import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Commitment } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  formatCurrency,
  formatDaysOfWeek,
  getDaysRemaining,
  getRefundPerDay,
  getTotalCommittedDays,
  getTotalRefunded,
  goalTypeLabel,
  hasTodayCheckIn,
  isActive,
  isExpired,
  isTodayScheduled,
  getVerifiedCheckIns,
} from "@/utils/commitment";

interface Props {
  commitment: Commitment;
  onCheckIn?: (commitment: Commitment) => void;
  compact?: boolean;
}

const GOAL_ICONS: Record<string, string> = {
  content: "video",
  steps: "activity",
};

export function CommitmentCard({ commitment: c, onCheckIn, compact }: Props) {
  const colors = useColors();
  const router = useRouter();
  const refunded = getTotalRefunded(c);
  const perDay = getRefundPerDay(c);
  const totalDays = getTotalCommittedDays(c);
  const verified = getVerifiedCheckIns(c).length;
  const checkedToday = hasTodayCheckIn(c);
  const todayScheduled = isTodayScheduled(c);
  const active = isActive(c);
  const expired = isExpired(c);
  const daysLeft = getDaysRemaining(c);
  const progress = totalDays > 0 ? Math.min(verified / totalDays, 1) : 0;

  function handlePress() {
    router.push(`/commitment/${c.id}`);
  }

  function handleCheckIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCheckIn?.(c);
  }

  const showCheckInBtn = active && todayScheduled && !checkedToday;
  const showDoneState = active && todayScheduled && checkedToday;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: active
                ? colors.primary + "1A"
                : colors.secondary,
            },
          ]}
        >
          <Feather
            name={GOAL_ICONS[c.goalType] as any}
            size={18}
            color={active ? colors.primary : colors.mutedForeground}
          />
        </View>

        <View style={styles.titleBlock}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {c.name}
          </Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {goalTypeLabel(c.goalType)} · {formatDaysOfWeek(c.daysOfWeek)}
          </Text>
        </View>

        {showCheckInBtn && (
          <TouchableOpacity
            onPress={handleCheckIn}
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather
              name={c.goalType === "content" ? "link" : "activity"}
              size={15}
              color="#000"
            />
          </TouchableOpacity>
        )}
        {showDoneState && (
          <View
            style={[
              styles.actionBtn,
              { backgroundColor: colors.primary + "22" },
            ]}
          >
            <Feather name="check-circle" size={15} color={colors.primary} />
          </View>
        )}
        {(!active || !todayScheduled) && (
          <View
            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather
              name={expired ? "flag" : "calendar"}
              size={15}
              color={colors.mutedForeground}
            />
          </View>
        )}
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%` as any,
                backgroundColor: expired ? colors.mutedForeground : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
          {verified}/{totalDays}
        </Text>
      </View>

      {!compact && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatCurrency(refunded, c.currency)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Refunded
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {formatCurrency(perDay, c.currency)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Per day
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text
              style={[
                styles.statValue,
                {
                  color: expired
                    ? colors.mutedForeground
                    : colors.foreground,
                },
              ]}
            >
              {expired ? "Done" : `${daysLeft}d left`}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {expired ? "Status" : "Remaining"}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    minWidth: 30,
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    width: 1,
    height: 28,
  },
});
