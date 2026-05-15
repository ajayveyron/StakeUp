import { useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificationButton } from "@/components/NotificationButton";
import { useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@convex/_generated/api";
import {
  formatCurrency,
  formatDate,
  formatDaysOfWeek,
  getAmountAtRisk,
  getPeriodLabel,
  getRefundPerDay,
  getSuccessRate,
  getTotalCommittedDays,
  getTotalRefunded,
  getVerifiedCheckIns,
  goalTypeLabel,
  isExpired,
  isPendingPayment,
} from "@/utils/commitment";

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const currentUser = useQuery(api.users.current);
  const wallet = useQuery(api.wallet.getMine);
  const { commitments } = useCommitments();

  const confirmedCommitments = commitments.filter((c) => !isPendingPayment(c));
  const totalCommitted = confirmedCommitments.reduce(
    (s, c) => s + c.pactAmount,
    0
  );
  const totalRefunded = confirmedCommitments.reduce(
    (s, c) => s + getTotalRefunded(c),
    0
  );
  const totalAtRisk = confirmedCommitments.reduce(
    (s, c) => s + getAmountAtRisk(c),
    0
  );
  const totalCheckIns = commitments.reduce(
    (s, c) => s + getVerifiedCheckIns(c).length,
    0
  );
  const avgRate =
    commitments.length > 0
      ? Math.round(
          commitments.reduce((s, c) => s + getSuccessRate(c), 0) /
            commitments.length
        )
      : 0;

  const past = commitments.filter(isExpired);
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
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Stats
          </Text>
          <View style={styles.headerActions}>
            <NotificationButton />
            <TouchableOpacity
              onPress={() => void signOut()}
              style={[
                styles.signOutBtn,
                { backgroundColor: colors.secondary },
              ]}
              activeOpacity={0.75}
            >
              <Feather
                name="log-out"
                size={15}
                color={colors.mutedForeground}
              />
              <Text
                style={[
                  styles.signOutText,
                  { color: colors.mutedForeground },
                ]}
              >
                Sign out
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {currentUser?.role === "admin" && (
          <TouchableOpacity
            onPress={() => router.push("/admin/reviews")}
            style={[
              styles.adminCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            activeOpacity={0.82}
          >
            <View style={styles.adminLeft}>
              <View
                style={[
                  styles.adminIcon,
                  { backgroundColor: colors.accent + "18" },
                ]}
              >
                <Feather name="shield" size={15} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.adminTitle, { color: colors.foreground }]}>
                  Admin ops
                </Text>
                <Text
                  style={[
                    styles.adminMeta,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Payments, check-ins, reviews, payouts
                </Text>
              </View>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        )}

        {commitments.length === 0 ? (
          <View style={styles.empty}>
            <Feather
              name="bar-chart-2"
              size={36}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Nothing yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Create a pact and your stats will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* Hero stats */}
            <View style={styles.heroRow}>
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: colors.primary + "14",
                    borderColor: colors.primary + "33",
                  },
                ]}
              >
                <Text style={[styles.heroValue, { color: colors.primary }]}>
                  {formatCurrency(wallet?.availableToPayout ?? totalRefunded)}
                </Text>
                <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>
                  Pending Payout
                </Text>
              </View>
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: colors.accent + "14",
                    borderColor: colors.accent + "33",
                  },
                ]}
              >
                <Text style={[styles.heroValue, { color: colors.accent }]}>
                  {formatCurrency(totalAtRisk)}
                </Text>
                <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>
                  At Risk
                </Text>
              </View>
            </View>

            {/* Detail stats */}
            <View
              style={[
                styles.statsCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <StatRow
                icon="layers"
                label="Total committed"
                value={formatCurrency(totalCommitted)}
                colors={colors}
              />
              <Div colors={colors} />
              <StatRow
                icon="download"
                label="Deposits confirmed"
                value={formatCurrency(wallet?.depositsConfirmed ?? 0)}
                colors={colors}
              />
              <Div colors={colors} />
              <StatRow
                icon="send"
                label="Paid manually"
                value={formatCurrency(wallet?.paidOut ?? 0)}
                colors={colors}
              />
              <Div colors={colors} />
              <StatRow
                icon="check-circle"
                label="Total check-ins"
                value={totalCheckIns.toString()}
                colors={colors}
              />
              <Div colors={colors} />
              <StatRow
                icon="target"
                label="Commitments"
                value={commitments.length.toString()}
                colors={colors}
              />
              <Div colors={colors} />
              <StatRow
                icon="trending-up"
                label="Avg success rate"
                value={`${avgRate}%`}
                colors={colors}
                valueColor={
                  avgRate >= 70 ? colors.primary : colors.accent
                }
              />
            </View>

            {/* History */}
            {past.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  History
                </Text>
                {past.map((c) => {
                  const refunded = getTotalRefunded(c);
                  const total = getTotalCommittedDays(c);
                  const verified = getVerifiedCheckIns(c).length;
                  const rate = getSuccessRate(c);
                  const perDay = getRefundPerDay(c);

                  return (
                    <View
                      key={c.id}
                      style={[
                        styles.historyCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.historyTop}>
                        <View style={styles.historyLeft}>
                          <View
                            style={[
                              styles.historyIcon,
                              { backgroundColor: colors.secondary },
                            ]}
                          >
                            <Feather
                              name={
                                c.goalType === "content" ? "video" : "activity"
                              }
                              size={14}
                              color={colors.mutedForeground}
                            />
                          </View>
                          <View>
                            <Text
                              style={[
                                styles.historyName,
                                { color: colors.foreground },
                              ]}
                              numberOfLines={1}
                            >
                              {c.name}
                            </Text>
                            <Text
                              style={[
                                styles.historyMeta,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {goalTypeLabel(c.goalType)} ·{" "}
                              {formatDaysOfWeek(c.daysOfWeek)} ·{" "}
                              {getPeriodLabel(c.durationDays)}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.historyRefund,
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
                          {formatCurrency(refunded, c.currency)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.historyProgress,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.historyProgressFill,
                            {
                              width: `${Math.min((verified / total) * 100, 100)}%` as any,
                              backgroundColor:
                                rate >= 70 ? colors.primary : colors.accent,
                            },
                          ]}
                        />
                      </View>

                      <Text
                        style={[
                          styles.historyStats,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {verified}/{total} days · {rate}% success ·{" "}
                        {formatCurrency(perDay, c.currency)}/day ·{" "}
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
  icon,
  label,
  value,
  colors,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
  valueColor?: string;
}) {
  return (
    <View style={srStyles.row}>
      <View style={srStyles.left}>
        <Feather name={icon as any} size={14} color={colors.mutedForeground} />
        <Text style={[srStyles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
      <Text style={[srStyles.value, { color: valueColor ?? colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

function Div({ colors }: { colors: any }) {
  return <View style={[srStyles.divider, { backgroundColor: colors.border }]} />;
}

const srStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  value: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  signOutBtn: {
    minWidth: 92,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  signOutText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  adminCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adminLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  adminIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  adminTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  adminMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  heroRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  heroCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  heroValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  heroLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statsCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  historyCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  historyTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  historyName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    maxWidth: 170,
  },
  historyMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  historyRefund: { fontSize: 15, fontFamily: "Inter_700Bold" },
  historyProgress: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  historyProgressFill: { height: "100%", borderRadius: 2 },
  historyStats: { fontSize: 11, fontFamily: "Inter_400Regular" },
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
