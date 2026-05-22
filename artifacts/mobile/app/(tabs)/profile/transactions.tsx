import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrutalistBackdrop } from "@/components/BrutalistBackdrop";
import { useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import { useFirstName } from "@/hooks/useCurrentUser";
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

export default function TransactionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const wallet = useQuery(api.wallet.getMine);
  const requestManualPayout = useMutation(api.payments.requestManualPayout);
  const { commitments } = useCommitments();
  const firstName = useFirstName();
  const [withdrawing, setWithdrawing] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");

  const confirmedCommitments = commitments.filter((c) => !isPendingPayment(c));
  const totalCommitted = confirmedCommitments.reduce(
    (s, c) => s + c.pactAmount,
    0,
  );
  const totalRefunded = confirmedCommitments.reduce(
    (s, c) => s + getTotalRefunded(c),
    0,
  );
  const totalAtRisk = confirmedCommitments.reduce(
    (s, c) => s + getAmountAtRisk(c),
    0,
  );
  const totalCheckIns = commitments.reduce(
    (s, c) => s + getVerifiedCheckIns(c).length,
    0,
  );
  const avgRate =
    commitments.length > 0
      ? Math.round(
          commitments.reduce((s, c) => s + getSuccessRate(c), 0) /
            commitments.length,
        )
      : 0;

  const past = commitments.filter(isExpired);
  const topPadding = Platform.OS === "web" ? 12 : insets.top;
  const availableRefund = wallet?.availableToPayout ?? 0;
  const payoutRequested = wallet?.payoutRequested ?? 0;
  const normalizedUpiId = upiId.trim().toLowerCase();
  const canRequestRefund =
    availableRefund > 0 &&
    payoutRequested === 0 &&
    /^[a-z0-9.\-_]{2,256}@[a-z0-9.\-_]{2,64}$/i.test(normalizedUpiId);
  const showRefundPanel =
    commitments.length > 0 || availableRefund > 0 || payoutRequested > 0;

  async function handleWithdrawRefund() {
    if (withdrawing || !canRequestRefund) return;
    setWithdrawing(true);
    try {
      const result = await requestManualPayout({
        amount: availableRefund,
        currency: wallet?.currency ?? "INR",
        upiId: normalizedUpiId,
        payeeName: payeeName.trim() || undefined,
      });
      setUpiId("");
      setPayeeName("");
      Alert.alert(
        "Refund requested",
        `${formatCurrency(result.amount, result.currency)} is queued for manual UPI payout to ${normalizedUpiId}.`,
      );
    } catch (error) {
      Alert.alert(
        "Request failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrutalistBackdrop />
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.secondary }]}
            activeOpacity={0.75}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Transactions
          </Text>
        </View>

        {showRefundPanel && (
          <>
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
                <Text
                  style={[styles.heroLabel, { color: colors.mutedForeground }]}
                >
                  Refund Credit
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
                <Text
                  style={[styles.heroLabel, { color: colors.mutedForeground }]}
                >
                  Still at Risk
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleWithdrawRefund}
              disabled={withdrawing || !canRequestRefund}
              style={[
                styles.withdrawBtn,
                {
                  backgroundColor: canRequestRefund
                    ? colors.primary
                    : colors.secondary,
                  opacity: withdrawing ? 0.55 : 1,
                },
              ]}
              activeOpacity={0.84}
            >
              <Feather
                name="download"
                size={16}
                color={
                  canRequestRefund
                    ? colors.primaryForeground
                    : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.withdrawBtnText,
                  {
                    color: canRequestRefund
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                  },
                ]}
              >
                {withdrawing
                  ? "Requesting refund…"
                  : payoutRequested > 0
                    ? `${formatCurrency(payoutRequested)} payout requested`
                    : availableRefund > 0
                      ? canRequestRefund
                        ? "Request manual UPI refund"
                        : "Enter UPI ID to request refund"
                      : "No refund balance yet"}
              </Text>
            </TouchableOpacity>

            {availableRefund > 0 && payoutRequested === 0 && (
              <View
                style={[
                  styles.payoutDetails,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.payoutTitle, { color: colors.foreground }]}
                >
                  Payout destination
                </Text>
                <Text
                  style={[styles.payoutHint, { color: colors.mutedForeground }]}
                >
                  The Raven records this UPI ID with the refund request.
                </Text>
                <TextInput
                  value={upiId}
                  onChangeText={setUpiId}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="name@bank"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.payoutInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                    },
                  ]}
                />
                <TextInput
                  value={payeeName}
                  onChangeText={setPayeeName}
                  placeholder="Payee name"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.payoutInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                    },
                  ]}
                />
                {upiId.trim().length > 0 && !canRequestRefund && (
                  <Text style={[styles.payoutError, { color: colors.danger }]}>
                    Enter a valid UPI ID before requesting payout.
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        {commitments.length === 0 ? (
          <View style={styles.empty}>
            <Feather
              name="bar-chart-2"
              size={36}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {firstName ? `No record yet, ${firstName}` : "No record yet"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Lock money. Show proof. The record will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* Detail stats */}
            <View
              style={[
                styles.statsCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <StatRow
                icon="layers"
                label="Total locked"
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
                label="Refunded"
                value={formatCurrency(wallet?.paidOut ?? 0)}
                colors={colors}
              />
              <Div colors={colors} />
              <StatRow
                icon="check-circle"
                label="Successful days"
                value={totalCheckIns.toString()}
                colors={colors}
              />
              <Div colors={colors} />
              <StatRow
                icon="target"
                label="Pacts"
                value={commitments.length.toString()}
                colors={colors}
              />
              <Div colors={colors} />
              <StatRow
                icon="trending-up"
                label="Success rate"
                value={`${avgRate}%`}
                colors={colors}
                valueColor={avgRate >= 70 ? colors.primary : colors.accent}
              />
            </View>

            {/* History */}
            {past.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  Closed records
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
                              width:
                                `${Math.min((verified / total) * 100, 100)}%` as any,
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
                        {verified}/{total} successful days · {rate}% success ·{" "}
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
      <Text
        style={[srStyles.value, { color: valueColor ?? colors.foreground }]}
      >
        {value}
      </Text>
    </View>
  );
}

function Div({ colors }: { colors: any }) {
  return (
    <View style={[srStyles.divider, { backgroundColor: colors.border }]} />
  );
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
    gap: 12,
    marginBottom: 20,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  heroCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  heroValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  heroLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  withdrawBtn: {
    minHeight: 46,
    borderRadius: 8,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  withdrawBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  payoutDetails: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  payoutTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  payoutHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  payoutInput: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  payoutError: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statsCard: {
    borderRadius: 8,
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
    borderRadius: 8,
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
