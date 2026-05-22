import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { MotionPressable } from "@/components/motion/MotionPressable";
import { Commitment } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  addDays,
  canInferMissedDates,
  getCheckInForDate,
  getCheckInStatus,
  getScheduledDates,
  getTodayStr,
} from "@/utils/commitment";

type CompactCycleCalendarProps = {
  commitment: Commitment;
  onSelectDate: (date: string) => void;
  selectedDate: string;
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function cycleCells(commitment: Commitment) {
  const firstDay = new Date(commitment.startDate + "T00:00:00").getDay();
  const dates: (string | null)[] = Array.from({ length: firstDay }, () => null);

  let cursor = commitment.startDate;
  while (cursor <= commitment.endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  while (dates.length % 7 !== 0) dates.push(null);
  return dates;
}

function dayNumber(date: string) {
  return new Date(date + "T00:00:00").getDate().toString();
}

function cycleLabel(commitment: Commitment) {
  const start = new Date(commitment.startDate + "T00:00:00");
  const end = new Date(commitment.endDate + "T00:00:00");
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("en-IN", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
  });
  const endLabel = end.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  return `${startLabel} - ${endLabel}`;
}

export function CompactCycleCalendar({
  commitment,
  onSelectDate,
  selectedDate,
}: CompactCycleCalendarProps) {
  const colors = useColors();
  const today = getTodayStr();
  const cells = cycleCells(commitment);
  const scheduledSet = new Set(getScheduledDates(commitment));
  const inferMisses = canInferMissedDates(commitment);

  function cellState(date: string) {
    const isSelected = date === selectedDate;
    const isToday = date === today;
    const isScheduled = scheduledSet.has(date);
    const checkInStatus = getCheckInStatus(getCheckInForDate(commitment, date));
    const isPast = date < today;

    if (checkInStatus === "approved") {
      return {
        backgroundColor: colors.primary + "16",
        borderColor: isSelected ? colors.foreground : "transparent",
        color: colors.primary,
        dotColor: colors.primary,
        opacity: 1,
      };
    }

    if (checkInStatus === "under_review") {
      return {
        backgroundColor: colors.warning + "12",
        borderColor: isSelected ? colors.foreground : "transparent",
        color: colors.warning,
        dotColor: colors.warning,
        opacity: 1,
      };
    }

    if (
      checkInStatus === "rejected" ||
      checkInStatus === "missed" ||
      (inferMisses && isScheduled && isPast)
    ) {
      return {
        backgroundColor: colors.danger + "10",
        borderColor: isSelected ? colors.foreground : "transparent",
        color: colors.danger,
        dotColor: colors.danger,
        opacity: 1,
      };
    }

    if (isToday) {
      return {
        backgroundColor: colors.accent + "16",
        borderColor: isSelected ? colors.foreground : "transparent",
        color: colors.accent,
        dotColor: null,
        opacity: 1,
      };
    }

    if (isScheduled) {
      return {
        backgroundColor: colors.secondary,
        borderColor: isSelected ? colors.foreground : "transparent",
        color: colors.foreground,
        dotColor: null,
        opacity: date > today ? 0.66 : 0.9,
      };
    }

    return {
      backgroundColor: "transparent",
      borderColor: isSelected ? colors.foreground : colors.border,
      color: colors.mutedForeground,
      dotColor: null,
      opacity: 0.42,
    };
  }

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="calendar" size={14} color={colors.mutedForeground} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            {cycleLabel(commitment)}
          </Text>
        </View>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {commitment.name}
        </Text>
      </View>

      <View style={styles.dayLabels}>
        {DAY_LABELS.map((day, index) => (
          <Text
            key={`${day}-${index}`}
            style={[styles.dayLabel, { color: colors.mutedForeground }]}
          >
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, index) => {
          if (!date) return <View key={`empty-${index}`} style={styles.cell} />;
          const state = cellState(date);
          return (
            <MotionPressable
              key={date}
              onPress={() => onSelectDate(date)}
              pressedOpacity={0.9}
              style={[
                styles.cell,
                styles.cellButton,
                {
                  backgroundColor: state.backgroundColor,
                  borderColor: state.borderColor,
                  opacity: state.opacity,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Select ${new Date(
                date + "T00:00:00",
              ).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}`}
              accessibilityState={{ selected: date === selectedDate }}
            >
              <Text style={[styles.cellText, { color: state.color }]}>
                {dayNumber(date)}
              </Text>
              {state.dotColor && (
                <View
                  style={[styles.dot, { backgroundColor: state.dotColor }]}
                />
              )}
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  header: {
    gap: 4,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  dayLabels: {
    flexDirection: "row",
    marginBottom: 5,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  cellButton: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  cellText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
