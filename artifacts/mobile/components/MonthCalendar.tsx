import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Commitment } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  canInferMissedDates,
  getCheckInForDate,
  getCheckInStatus,
  getScheduledDates,
  getTodayStr,
} from "@/utils/commitment";

interface Props {
  commitment: Commitment;
  year?: number;
  month?: number;
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function MonthCalendar({ commitment, year, month }: Props) {
  const colors = useColors();
  const today = getTodayStr();

  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = new Date(y, m, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const scheduledSet = new Set(getScheduledDates(commitment));
  const inferMisses = canInferMissedDates(commitment);

  function pad(n: number) {
    return n.toString().padStart(2, "0");
  }

  function getCellStyle(day: number) {
    const dateStr = `${y}-${pad(m + 1)}-${pad(day)}`;
    const isToday = dateStr === today;
    const isScheduled = scheduledSet.has(dateStr);
    const checkIn = getCheckInForDate(commitment, dateStr);
    const checkInStatus = getCheckInStatus(checkIn);
    const isPast = dateStr < today;

    if (!isScheduled) {
      return {
        bg: "transparent",
        textColor: colors.border,
        dot: null,
        opacity: 0.4,
      };
    }

    if (checkInStatus === "approved") {
      return {
        bg: colors.primary + "22",
        textColor: colors.primary,
        dot: colors.primary,
        opacity: 1,
      };
    }

    if (checkInStatus === "under_review") {
      return {
        bg: colors.warning + "15",
        textColor: colors.warning,
        dot: colors.warning,
        opacity: 1,
      };
    }

    if (checkInStatus === "rejected" || checkInStatus === "missed") {
      return {
        bg: colors.danger + "11",
        textColor: colors.danger,
        dot: colors.danger,
        opacity: 1,
      };
    }

    if (isToday) {
      return {
        bg: colors.accent + "22",
        textColor: colors.accent,
        dot: null,
        opacity: 1,
      };
    }

    if (inferMisses && isPast) {
      return {
        bg: colors.danger + "11",
        textColor: colors.danger,
        dot: colors.danger,
        opacity: 1,
      };
    }

    // Future scheduled
    return {
      bg: colors.secondary,
      textColor: colors.mutedForeground,
      dot: null,
      opacity: 0.6,
    };
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.monthLabel, { color: colors.foreground }]}>
        {monthLabel}
      </Text>
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((d) => (
          <Text
            key={d}
            style={[styles.dayLabel, { color: colors.mutedForeground }]}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={styles.cell} />;
          const { bg, textColor, dot, opacity } = getCellStyle(day);
          return (
            <View
              key={day}
              style={[
                styles.cell,
                { backgroundColor: bg, borderRadius: 8, opacity },
              ]}
            >
              <Text style={[styles.dayNum, { color: textColor }]}>{day}</Text>
              {dot && (
                <View style={[styles.dot, { backgroundColor: dot }]} />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <LegendItem color={colors.primary} label="Successful" colors={colors} />
        <LegendItem color={colors.warning} label="Raven" colors={colors} />
        <LegendItem color={colors.danger} label="Missed" colors={colors} />
        <LegendItem color={colors.accent} label="Today" colors={colors} />
      </View>
    </View>
  );
}

function LegendItem({
  color,
  label,
  colors,
}: {
  color: string;
  label: string;
  colors: any;
}) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={[legendStyles.text, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 10, fontFamily: "Inter_400Regular" },
});

const styles = StyleSheet.create({
  container: { paddingVertical: 4 },
  monthLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
    textAlign: "center",
  },
  dayLabels: { flexDirection: "row", marginBottom: 4 },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayNum: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 12,
  },
});
