import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { gradients } from "@/constants/colors";
import { Commitment } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  formatCurrency,
  formatDaysOfWeek,
  getCheckInForDate,
  getCheckInStatus,
  getDaysRemaining,
  getRefundPerDay,
  getTodayStr,
  getTotalCommittedDays,
  getTotalRefunded,
  getVerifiedCheckIns,
  goalTypeLabel,
  hasTodayCheckIn,
  isActive,
  isExpired,
  isPendingPayment,
  isTodayScheduled,
} from "@/utils/commitment";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

export interface CommitmentCardAction {
  label: string;
  icon: FeatherIconName;
  onPress?: () => void;
  disabled?: boolean;
  muted?: boolean;
  accessibilityLabel?: string;
}

interface Props {
  commitment: Commitment;
  onCheckIn?: (commitment: Commitment) => void;
  compact?: boolean;
  action?: CommitmentCardAction;
}

const GOAL_ICONS: Record<string, string> = {
  content: "video",
  workout: "activity",
};

export function CommitmentCard({
  commitment: c,
  onCheckIn,
  compact,
  action,
}: Props) {
  const colors = useColors();
  const router = useRouter();
  const refunded = getTotalRefunded(c);
  const perDay = getRefundPerDay(c);
  const totalDays = getTotalCommittedDays(c);
  const verified = getVerifiedCheckIns(c).length;
  const checkedToday = hasTodayCheckIn(c);
  const todayStatus = getCheckInStatus(getCheckInForDate(c, getTodayStr()));
  const todayScheduled = isTodayScheduled(c);
  const active = isActive(c);
  const expired = isExpired(c);
  const pendingPayment = isPendingPayment(c);
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
  const showSubmittedState = active && todayScheduled && checkedToday;
  const actionFg = action?.muted
    ? colors.mutedForeground
    : colors.primaryForeground;
  const actionBg = action?.muted ? colors.secondary : colors.primary;
  const actionNode = action ? (
    action.disabled ? (
      <View
        style={[
          styles.cardAction,
          {
            backgroundColor: actionBg,
            borderColor: colors.border,
          },
        ]}
      >
        <Feather name={action.icon as any} size={14} color={actionFg} />
        <Text
          style={[styles.cardActionText, { color: actionFg }]}
          numberOfLines={1}
        >
          {action.label}
        </Text>
      </View>
    ) : (
      <TouchableOpacity
        onPress={(event) => {
          event.stopPropagation?.();
          action.onPress?.();
        }}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={action.accessibilityLabel ?? action.label}
      >
        <View
          style={[
            styles.cardAction,
            {
              backgroundColor: actionBg,
              borderColor: action.muted ? colors.border : actionBg,
            },
          ]}
        >
          <Feather name={action.icon as any} size={14} color={actionFg} />
          <Text
            style={[styles.cardActionText, { color: actionFg }]}
            numberOfLines={1}
          >
            {action.label}
          </Text>
        </View>
      </TouchableOpacity>
    )
  ) : null;

  return (
    <LinearGradient
      colors={active ? gradients.cardActive : gradients.cardMuted}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradBorder}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.75}
        style={[styles.card, { backgroundColor: colors.card }]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${c.name}`}
      >
        <View style={styles.header}>
          {active ? (
            <LinearGradient
              colors={["rgba(255,216,0,0.22)", "rgba(255,216,0,0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBox}
            >
              <Feather
                name={GOAL_ICONS[c.goalType] as any}
                size={18}
                color={
                  c.goalType === "content" ? colors.primary : colors.accent
                }
              />
            </LinearGradient>
          ) : (
            <View
              style={[styles.iconBox, { backgroundColor: colors.secondary }]}
            >
              <Feather
                name={GOAL_ICONS[c.goalType] as any}
                size={18}
                color={colors.mutedForeground}
              />
            </View>
          )}

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
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Show proof for ${c.name}`}
            >
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionBtn}
              >
                <Feather
                  name={c.goalType === "content" ? "link" : "activity"}
                  size={15}
                  color={colors.primaryForeground}
                />
              </LinearGradient>
            </TouchableOpacity>
          )}
          {showSubmittedState && (
            <View
              style={[
                styles.actionBtn,
                {
                  backgroundColor:
                    todayStatus === "approved"
                      ? colors.primary + "22"
                      : colors.accent + "22",
                },
              ]}
            >
              <Feather
                name={todayStatus === "approved" ? "check-circle" : "clock"}
                size={15}
                color={todayStatus === "approved" ? colors.primary : colors.accent}
              />
            </View>
          )}
          {(!active || !todayScheduled) && (
            <View
              style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather
                name={pendingPayment ? "clock" : expired ? "flag" : "calendar"}
                size={15}
                color={pendingPayment ? colors.accent : colors.mutedForeground}
              />
            </View>
          )}
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <LinearGradient
              colors={
                expired
                  ? ([colors.mutedForeground, colors.mutedForeground] as [
                      string,
                      string,
                    ])
                  : gradients.primary
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` as any },
              ]}
            />
          </View>
          <Text
            style={[styles.progressText, { color: colors.mutedForeground }]}
          >
            {pendingPayment ? "Not started" : `${verified}/${totalDays}`}
          </Text>
        </View>

        {!compact && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatCurrency(refunded, c.currency)}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                Refund credit
              </Text>
            </View>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {formatCurrency(perDay, c.currency)}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                Credit/day
              </Text>
            </View>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
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
                {pendingPayment ? "Draft" : expired ? "Closed" : `${daysLeft}d left`}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                {expired ? "Record" : "Remaining"}
              </Text>
            </View>
          </View>
        )}

        {actionNode}
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradBorder: {
    borderRadius: 8,
    padding: 1,
    marginBottom: 12,
  },
  card: {
    borderRadius: 8,
    padding: 16,
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
    borderRadius: 8,
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
    borderRadius: 8,
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
  cardAction: {
    marginTop: 14,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cardActionText: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
