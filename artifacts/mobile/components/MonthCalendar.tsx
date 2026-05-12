import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Commitment } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import { getTodayStr, hasCheckedInOnDate } from "@/utils/commitment";

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

  function pad(n: number) {
    return n.toString().padStart(2, "0");
  }

  function getCellStyle(day: number) {
    const dateStr = `${y}-${pad(m + 1)}-${pad(day)}`;
    const isToday = dateStr === today;
    const isInRange =
      dateStr >= commitment.startDate && dateStr <= commitment.endDate;
    const checked = hasCheckedInOnDate(commitment, dateStr);
    const isPast = dateStr < today;
    const isFuture = dateStr > today;

    if (!isInRange) return { bg: "transparent", textColor: colors.border, dot: null };
    if (checked) return { bg: colors.primary + "22", textColor: colors.primary, dot: colors.primary };
    if (isToday) return { bg: colors.accent + "22", textColor: colors.accent, dot: null };
    if (isPast) return { bg: colors.danger + "11", textColor: colors.danger, dot: colors.danger };
    return { bg: "transparent", textColor: colors.mutedForeground, dot: null };
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.monthLabel, { color: colors.foreground }]}>
        {monthLabel}
      </Text>
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={[styles.dayLabel, { color: colors.mutedForeground }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={styles.cell} />;
          const { bg, textColor, dot } = getCellStyle(day);
          return (
            <View key={day} style={[styles.cell, { backgroundColor: bg, borderRadius: 8 }]}>
              <Text style={[styles.dayNum, { color: textColor }]}>{day}</Text>
              {dot && (
                <View style={[styles.dot, { backgroundColor: dot }]} />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Done</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Missed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
    textAlign: "center",
  },
  dayLabels: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayNum: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
