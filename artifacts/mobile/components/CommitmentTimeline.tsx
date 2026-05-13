import { Feather } from "@expo/vector-icons";
import React, { useRef, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Commitment } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  getCheckInForDate,
  getCheckInStatus,
  getMissedDates,
  getScheduledDates,
  getTodayStr,
  isPerfectSoFar,
} from "@/utils/commitment";

interface Props {
  commitment: Commitment;
}

export function CommitmentTimeline({ commitment }: Props) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const today = getTodayStr();
  const scheduled = getScheduledDates(commitment);
  const perfect = isPerfectSoFar(commitment);
  const missedDates = getMissedDates(commitment);
  const isExpired = commitment.endDate < today;

  // Auto-scroll to today's node
  useEffect(() => {
    const todayIdx = scheduled.indexOf(today);
    if (todayIdx > 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: todayIdx * 56, animated: true });
      }, 300);
    }
  }, [today, scheduled]);

  if (scheduled.length === 0) return null;

  const lastDate = scheduled[scheduled.length - 1];

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {scheduled.map((date, idx) => {
        const isLast = date === lastDate;
        const isToday = date === today;
        const isFuture = date > today;
        const isPast = date < today;
        const checkIn = getCheckInForDate(commitment, date);
        const status = getCheckInStatus(checkIn);
        const verified = status === "approved";
        const underReview = status === "under_review";
        const missed = isPast && status !== "approved" && status !== "under_review";

        // Mystery card = last slot
        if (isLast) {
          const unlocked = isExpired && perfect;
          const broken = missedDates.length > 0;
          return (
            <View key={date} style={styles.node}>
              <View
                style={[
                  styles.mysteryBox,
                  {
                    borderColor: broken
                      ? colors.border
                      : unlocked
                      ? "#FFD700"
                      : colors.accent + "88",
                    backgroundColor: broken
                      ? colors.secondary
                      : unlocked
                      ? "#FFD70022"
                      : colors.accent + "15",
                    opacity: broken ? 0.45 : 1,
                  },
                ]}
              >
                <Text style={styles.mysteryEmoji}>
                  {unlocked ? "🏆" : broken ? "💔" : "🔒"}
                </Text>
              </View>
              <Text style={[styles.dayLabel, { color: colors.mutedForeground }]}>
                {new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
              <Text
                style={[
                  styles.mysteryLabel,
                  {
                    color: broken
                      ? colors.mutedForeground
                      : unlocked
                      ? "#FFD700"
                      : colors.accent,
                    opacity: broken ? 0.5 : 1,
                  },
                ]}
              >
                {unlocked ? "Unlocked!" : broken ? "Broken" : "Bonus"}
              </Text>
            </View>
          );
        }

        // Connector line before this node (skip first)
        const dot = verified
          ? colors.primary
          : underReview
          ? colors.accent
          : missed
          ? colors.danger
          : isToday
          ? colors.accent
          : colors.border;

        const dotFilled = verified || underReview || missed || isToday;

        return (
          <View key={date} style={styles.node}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: dotFilled ? dot : "transparent",
                  borderColor: dot,
                  borderWidth: dotFilled ? 0 : 1.5,
                },
              ]}
            >
              {verified && (
                <Feather name="check" size={13} color="#000" />
              )}
              {missed && (
                <Feather name="x" size={13} color="#fff" />
              )}
              {underReview && !verified && (
                <Feather name="clock" size={12} color="#000" />
              )}
              {isToday && !verified && !underReview && !missed && (
                <View
                  style={[styles.todayInner, { backgroundColor: "#000" }]}
                />
              )}
              {isFuture && (
                <Text
                  style={[styles.futureNum, { color: colors.mutedForeground }]}
                >
                  {new Date(date + "T00:00:00").getDate()}
                </Text>
              )}
            </View>
            <Text style={[styles.dayLabel, { color: colors.mutedForeground }]}>
              {new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
                weekday: "short",
              })}
            </Text>
            <Text
              style={[
                styles.dateNum,
                {
                  color: isToday
                    ? colors.accent
                    : verified
                    ? colors.primary
                    : underReview
                    ? colors.accent
                    : missed
                    ? colors.danger
                    : colors.mutedForeground,
                  fontFamily: isToday
                    ? "Inter_700Bold"
                    : "Inter_400Regular",
                  opacity: isFuture ? 0.4 : 1,
                },
              ]}
            >
              {new Date(date + "T00:00:00").getDate()}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 6,
  },
  node: {
    width: 48,
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  todayInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  futureNum: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
  },
  dateNum: {
    fontSize: 11,
  },
  // Mystery card (last slot)
  mysteryBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  mysteryEmoji: { fontSize: 17 },
  mysteryLabel: {
    fontSize: 8,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
