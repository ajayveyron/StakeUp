import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Commitment } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  formatCurrency,
  getEarningsPerCheckIn,
  getTotalEarned,
  goalTypeLabel,
  hasCheckedInToday,
  isActive,
  isExpired,
  getDaysRemaining,
} from "@/utils/commitment";

interface Props {
  commitment: Commitment;
  onCheckIn?: (id: string) => void;
  compact?: boolean;
}

const GOAL_ICONS: Record<string, string> = {
  content: "video",
  steps: "activity",
  exercise: "zap",
  reading: "book-open",
  custom: "target",
};

export function CommitmentCard({ commitment: c, onCheckIn, compact }: Props) {
  const colors = useColors();
  const router = useRouter();
  const earned = getTotalEarned(c);
  const perCheckIn = getEarningsPerCheckIn(c);
  const checkedToday = hasCheckedInToday(c);
  const active = isActive(c);
  const expired = isExpired(c);
  const daysLeft = getDaysRemaining(c);
  const progress = Math.min(c.checkIns.length / c.targetCount, 1);

  function handleCheckIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCheckIn?.(c.id);
  }

  function handlePress() {
    router.push(`/commitment/${c.id}`);
  }

  const statusColor = expired
    ? colors.mutedForeground
    : active
    ? colors.primary
    : colors.mutedForeground;

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
            { backgroundColor: active ? colors.primary + "1A" : colors.secondary },
          ]}
        >
          <Feather
            name={GOAL_ICONS[c.goalType] as any}
            size={18}
            color={active ? colors.primary : colors.mutedForeground}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {c.name}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {c.targetCount} {c.goalUnit} · {formatCurrency(c.stakeAmount, c.currency)}
          </Text>
        </View>
        {active && !checkedToday && (
          <TouchableOpacity
            onPress={handleCheckIn}
            style={[styles.checkBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="check" size={16} color="#000" />
          </TouchableOpacity>
        )}
        {active && checkedToday && (
          <View style={[styles.checkBtn, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="check-circle" size={16} color={colors.primary} />
          </View>
        )}
        {!active && (
          <View style={[styles.checkBtn, { backgroundColor: colors.secondary }]}>
            <Feather
              name={expired ? "flag" : "clock"}
              size={16}
              color={colors.mutedForeground}
            />
          </View>
        )}
      </View>

      <View style={styles.progressRow}>
        <View
          style={[styles.progressBg, { backgroundColor: colors.border }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%` as any,
                backgroundColor: expired
                  ? colors.mutedForeground
                  : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
          {c.checkIns.length}/{c.targetCount}
        </Text>
      </View>

      {!compact && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatCurrency(earned, c.currency)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Earned
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {formatCurrency(perCheckIn, c.currency)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Per check-in
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text
              style={[
                styles.statValue,
                { color: expired ? colors.mutedForeground : colors.foreground },
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
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  checkBtn: {
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
