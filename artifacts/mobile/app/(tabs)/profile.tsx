import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  formatCurrency,
  getTotalEarned,
  isExpired,
  getSuccessRate,
  goalTypeLabel,
  getPeriodLabel,
  formatDate,
} from "@/utils/commitment";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { commitments } = useCommitments();

  const totalStaked = commitments.reduce((s, c) => s + c.stakeAmount, 0);
  const totalEarned = commitments.reduce((s, c) => s + getTotalEarned(c), 0);
  const totalLost = totalStaked - totalEarned;
  const successRate =
    commitments.length > 0
      ? Math.round(
          commitments.reduce((s, c) => s + getSuccessRate(c), 0) /
            commitments.length
        )
      : 0;

  const pastCommitments = commitments.filter(isExpired);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPadding + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Stats</Text>

        {commitments.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="bar-chart-2" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No data yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Your earnings and stats will appear here once you create commitments.
            </Text>
          </View>
        ) : (
          <>
            {/* Big stats */}
            <View style={styles.bigStats}>
              <View
                style={[
                  styles.bigStat,
                  { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" },
                ]}
              >
                <Text style={[styles.bigStatValue, { color: colors.primary }]}>
                  {formatCurrency(totalEarned)}
                </Text>
                <Text style={[styles.bigStatLabel, { color: colors.mutedForeground }]}>
                  Total Earned
                </Text>
              </View>
              <View
                style={[
                  styles.bigStat,
                  { backgroundColor: colors.accent + "14", borderColor: colors.accent + "33" },
                ]}
              >
                <Text style={[styles.bigStatValue, { color: colors.accent }]}>
                  {formatCurrency(totalStaked)}
                </Text>
                <Text style={[styles.bigStatLabel, { color: colors.mutedForeground }]}>
                  Total Staked
                </Text>
              </View>
            </View>

            {/* Secondary stats */}
            <View
              style={[
                styles.statsCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <StatRow
                label="Total check-ins"
                value={commitments.reduce((s, c) => s + c.checkIns.length, 0).toString()}
                colors={colors}
                icon="check-circle"
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <StatRow
                label="Commitments"
                value={commitments.length.toString()}
                colors={colors}
                icon="target"
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <StatRow
                label="Success rate"
                value={`${successRate}%`}
                colors={colors}
                icon="trending-up"
                valueColor={successRate >= 70 ? colors.primary : colors.accent}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <StatRow
                label="Amount at risk"
                value={formatCurrency(Math.max(0, totalLost))}
                colors={colors}
                icon="alert-circle"
                valueColor={totalLost > 0 ? colors.danger : colors.primary}
              />
            </View>

            {/* History */}
            {pastCommitments.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  History
                </Text>
                {pastCommitments.map((c) => {
                  const earned = getTotalEarned(c);
                  const rate = getSuccessRate(c);
                  return (
                    <View
                      key={c.id}
                      style={[
                        styles.historyCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.historyHeader}>
                        <Text
                          style={[styles.historyName, { color: colors.foreground }]}
                          numberOfLines={1}
                        >
                          {c.name}
                        </Text>
                        <Text
                          style={[
                            styles.historyEarned,
                            {
                              color:
                                rate >= 100
                                  ? colors.primary
                                  : rate >= 50
                                  ? colors.accent
                                  : colors.danger,
                            },
                          ]}
                        >
                          {formatCurrency(earned)}
                        </Text>
                      </View>
                      <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>
                        {goalTypeLabel(c.goalType)} · {getPeriodLabel(c.startDate, c.endDate)} ·{" "}
                        {c.checkIns.length}/{c.targetCount} check-ins · {rate}%
                      </Text>
                      <Text style={[styles.historyDate, { color: colors.border }]}>
                        {formatDate(c.startDate)} – {formatDate(c.endDate)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatRow({
  label,
  value,
  colors,
  icon,
  valueColor,
}: {
  label: string;
  value: string;
  colors: any;
  icon: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statRowLeft}>
        <Feather name={icon as any} size={14} color={colors.mutedForeground} />
        <Text style={[styles.statRowLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.statRowValue,
          { color: valueColor ?? colors.foreground },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
  },
  bigStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  bigStat: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  bigStatValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  bigStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statRowLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  statRowValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  historyCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  historyEarned: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  historyMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  historyDate: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
});
