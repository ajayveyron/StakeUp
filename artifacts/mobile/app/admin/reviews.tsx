import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/utils/commitment";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

type PendingReviewRow = {
  checkIn: {
    id: string;
    date: string;
    proofUrl?: string;
    proofPrompt?: string;
    submissionStatement?: string;
    stepCount?: number;
    submittedAt: string;
    status: "under_review";
  };
  commitment: {
    id: string;
    name: string;
    goalType: "content" | "workout";
    targetPerDay: number;
    currency: string;
    refundPerDay: number;
  };
  user: {
    id: string;
    email?: string;
    displayName?: string;
  };
};

type AdminOverview = {
  pendingPayments: Array<{
    commitment: {
      id: string;
      name: string;
      goalType: "content" | "workout";
      startDate: string;
      endDate: string;
      pactAmount: number;
      currency: string;
      createdAt: string;
    };
    user: AdminUser;
  }>;
  todayCheckIns: Array<{
    date: string;
    status: "due" | "under_review" | "approved" | "rejected" | "missed";
    submittedAt?: string;
    checkInId?: string;
    proofUrl?: string;
    proofPrompt?: string;
    submissionStatement?: string;
    stepCount?: number;
    commitment: {
      id: string;
      name: string;
      goalType: "content" | "workout";
      targetPerDay: number;
      currency: string;
      refundPerDay: number;
    };
    user: AdminUser;
  }>;
  pendingReviews: PendingReviewRow[];
  payoutBalances: Array<{
    user: AdminUser;
    currency: string;
    amount: number;
  }>;
  recentLedger: Array<{
    id: string;
    type:
      | "deposit_confirmed"
      | "approved_refund"
      | "forfeited"
      | "manual_payout";
    amount: number;
    currency: string;
    destination: "user" | "charity" | "razorpay";
    externalReference?: string;
    note?: string;
    createdAt: string;
    user: AdminUser;
    commitment?: {
      id: string;
      name: string;
    };
  }>;
};

type AdminUser = {
  id: string;
  label: string;
  email?: string;
  phone?: string;
  displayName?: string;
};

type Tab = "payments" | "today" | "reviews" | "refunds" | "ledger";

const TABS: { key: Tab; label: string }[] = [
  { key: "payments", label: "Payments" },
  { key: "today", label: "Today" },
  { key: "reviews", label: "Review" },
  { key: "refunds", label: "Refunds" },
  { key: "ledger", label: "Ledger" },
];

function statusColor(status: string, colors: any) {
  if (status === "approved") return colors.primary;
  if (status === "under_review") return colors.accent;
  if (status === "due") return colors.foreground;
  return colors.danger;
}

function ledgerLabel(type: AdminOverview["recentLedger"][number]["type"]) {
  switch (type) {
    case "deposit_confirmed":
      return "Deposit";
    case "approved_refund":
      return "Approved";
    case "forfeited":
      return "Forfeited";
    case "manual_payout":
      return "Refund paid";
  }
}

function proofLabel(args: {
  goalType: "content" | "workout";
  proofUrl?: string;
  proofPrompt?: string;
  submissionStatement?: string;
  stepCount?: number;
}) {
  const suffix = signedLabel(args.submissionStatement);
  if (args.proofUrl && args.proofPrompt) {
    return `${args.proofUrl} · prompt ${args.proofPrompt}${suffix}`;
  }
  if (args.proofUrl) return `${args.proofUrl}${suffix}`;
  if (args.stepCount !== undefined) {
    return `${args.stepCount.toLocaleString("en-IN")} legacy steps${suffix}`;
  }
  return `${
    args.goalType === "content"
      ? "Waiting for public post link"
      : "Waiting for workout camera proof"
  }${suffix}`;
}

function signedLabel(statement?: string) {
  return statement ? ` · signed "${statement}"` : "";
}

export default function AdminReviewsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useQuery(api.users.current);
  const overview = useQuery(
    api.reviews.adminOverview,
    currentUser?.role === "admin" ? {} : "skip"
  ) as AdminOverview | undefined;
  const confirmPayment = useMutation(api.reviews.confirmPayment);
  const recordManualPayout = useMutation(api.reviews.recordManualPayout);
  const approve = useMutation(api.reviews.approve);
  const reject = useMutation(api.reviews.reject);

  const [tab, setTab] = useState<Tab>("payments");
  const [references, setReferences] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});
  const [payoutNotes, setPayoutNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const isAdmin = currentUser?.role === "admin";
  const loading = currentUser === undefined || (isAdmin && overview === undefined);

  async function handleConfirmPayment(commitmentId: string) {
    setBusyId(commitmentId);
    try {
      await confirmPayment({
        commitmentId: commitmentId as Id<"commitments">,
        reference: references[commitmentId]?.trim() || undefined,
        note: notes[commitmentId]?.trim() || undefined,
      });
      setReferences((prev) => ({ ...prev, [commitmentId]: "" }));
      setNotes((prev) => ({ ...prev, [commitmentId]: "" }));
    } catch (error) {
      Alert.alert(
        "Payment confirmation failed",
        error instanceof Error ? error.message : ""
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(checkInId: string) {
    setBusyId(checkInId);
    try {
      await approve({ checkInId: checkInId as Id<"checkIns"> });
    } catch (error) {
      Alert.alert("Approval failed", error instanceof Error ? error.message : "");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(checkInId: string) {
    const reason = reasons[checkInId]?.trim();
    if (!reason) {
      Alert.alert("Reason required", "Add a rejection reason first.");
      return;
    }
    setBusyId(checkInId);
    try {
      await reject({ checkInId: checkInId as Id<"checkIns">, reason });
      setReasons((prev) => ({ ...prev, [checkInId]: "" }));
    } catch (error) {
      Alert.alert("Rejection failed", error instanceof Error ? error.message : "");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePayout(userId: string, currency: string, amount: number) {
    const key = `${userId}:${currency}`;
    setBusyId(key);
    try {
      await recordManualPayout({
        userId: userId as Id<"users">,
        amount,
        currency,
        reference: payoutRefs[key]?.trim() || undefined,
        note: payoutNotes[key]?.trim() || undefined,
      });
      setPayoutRefs((prev) => ({ ...prev, [key]: "" }));
      setPayoutNotes((prev) => ({ ...prev, [key]: "" }));
    } catch (error) {
      Alert.alert("Payout failed", error instanceof Error ? error.message : "");
    } finally {
      setBusyId(null);
    }
  }

  const counts = {
    payments: overview?.pendingPayments.length ?? 0,
    today: overview?.todayCheckIns.length ?? 0,
    reviews: overview?.pendingReviews.length ?? 0,
    refunds: overview?.payoutBalances.length ?? 0,
    ledger: overview?.recentLedger.length ?? 0,
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 8, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Admin ops
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Razorpay, proof review, refunds
          </Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !isAdmin ? (
        <View style={styles.center}>
          <Feather name="lock" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Admin access required
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Platform.OS === "web" ? 36 : insets.bottom + 36 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {TABS.map((item) => {
              const selected = tab === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.82}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: selected ? "#000" : colors.mutedForeground },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {counts[item.key] > 0 && (
                    <View
                      style={[
                        styles.countPill,
                        {
                          backgroundColor: selected
                            ? "rgba(0,0,0,0.14)"
                            : colors.secondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.countText,
                          { color: selected ? "#000" : colors.foreground },
                        ]}
                      >
                        {counts[item.key]}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {tab === "payments" && (
            <View style={styles.section}>
              {overview!.pendingPayments.length === 0 ? (
                <EmptyState
                  icon="check-circle"
                  title="No pending payments"
                  body="New payment requests will appear here."
                  colors={colors}
                />
              ) : (
                overview!.pendingPayments.map((row) => {
                  const commitmentId = row.commitment.id;
                  const busy = busyId === commitmentId;
                  return (
                    <View
                      key={commitmentId}
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <CardTop
                        icon="credit-card"
                        title={row.commitment.name}
                        meta={`${row.user.label} · ${formatDate(row.commitment.startDate)}`}
                        amount={formatCurrency(
                          row.commitment.pactAmount,
                          row.commitment.currency
                        )}
                        amountColor={colors.accent}
                        colors={colors}
                      />
                      <TextInput
                        value={references[commitmentId] ?? ""}
                        onChangeText={(value) =>
                          setReferences((prev) => ({
                            ...prev,
                            [commitmentId]: value,
                          }))
                        }
                        placeholder="Razorpay payment id or note"
                        placeholderTextColor={colors.mutedForeground}
                        style={[
                          styles.input,
                          {
                            color: colors.foreground,
                            backgroundColor: colors.input,
                            borderColor: colors.border,
                          },
                        ]}
                        editable={!busy}
                      />
                      <TextInput
                        value={notes[commitmentId] ?? ""}
                        onChangeText={(value) =>
                          setNotes((prev) => ({ ...prev, [commitmentId]: value }))
                        }
                        placeholder="Internal note"
                        placeholderTextColor={colors.mutedForeground}
                        style={[
                          styles.input,
                          {
                            color: colors.foreground,
                            backgroundColor: colors.input,
                            borderColor: colors.border,
                          },
                        ]}
                        editable={!busy}
                      />
                      <TouchableOpacity
                        onPress={() => handleConfirmPayment(commitmentId)}
                        disabled={busy}
                        style={[
                          styles.primaryBtn,
                          {
                            backgroundColor: colors.primary,
                            opacity: busy ? 0.5 : 1,
                          },
                        ]}
                        activeOpacity={0.84}
                      >
                        <Feather name="check" size={15} color="#000" />
                        <Text style={styles.primaryBtnText}>
                          Confirm payment and activate
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {tab === "today" && (
            <View style={styles.section}>
              {overview!.todayCheckIns.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="No check-ins due today"
                  body="Active users scheduled for today will appear here."
                  colors={colors}
                />
              ) : (
                overview!.todayCheckIns.map((row) => (
                  <View
                    key={`${row.commitment.id}:${row.date}`}
                    style={[
                      styles.card,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <CardTop
                      icon={
                        row.commitment.goalType === "content"
                          ? "video"
                          : "activity"
                      }
                      title={row.commitment.name}
                      meta={`${row.user.label} · ${formatDate(row.date)}`}
                      amount={row.status.replace("_", " ")}
                      amountColor={statusColor(row.status, colors)}
                      colors={colors}
                    />
                    <View
                      style={[
                        styles.proofBox,
                        { backgroundColor: colors.secondary },
                      ]}
                    >
                      <Feather
                        name={row.proofUrl ? "link" : "clock"}
                        size={14}
                        color={colors.mutedForeground}
                      />
                      <Text
                        style={[styles.proofText, { color: colors.foreground }]}
                        numberOfLines={2}
                      >
                        {proofLabel({
                          goalType: row.commitment.goalType,
                          proofUrl: row.proofUrl,
                          proofPrompt: row.proofPrompt,
                          submissionStatement: row.submissionStatement,
                          stepCount: row.stepCount,
                        })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {tab === "reviews" && (
            <View style={styles.section}>
              {overview!.pendingReviews.length === 0 ? (
                <EmptyState
                  icon="check-circle"
                  title="Nothing pending"
                  body="New proof submissions will appear here."
                  colors={colors}
                />
              ) : (
                overview!.pendingReviews.map((row) => {
                  const checkInId = row.checkIn.id;
                  const busy = busyId === checkInId;
                  return (
                    <View
                      key={checkInId}
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <CardTop
                        icon={
                          row.commitment.goalType === "content"
                            ? "link"
                            : "activity"
                        }
                        title={row.commitment.name}
                        meta={`${row.user.email ?? row.user.displayName ?? "Unknown user"} · ${formatDate(row.checkIn.date)}`}
                        amount={formatCurrency(
                          row.commitment.refundPerDay,
                          row.commitment.currency
                        )}
                        amountColor={colors.primary}
                        colors={colors}
                      />
                      <View
                        style={[
                          styles.proofBox,
                          { backgroundColor: colors.secondary },
                        ]}
                      >
                        <Feather
                          name={
                            row.commitment.goalType === "content"
                              ? "link"
                              : "activity"
                          }
                          size={14}
                          color={colors.mutedForeground}
                        />
                        <Text
                          style={[styles.proofText, { color: colors.foreground }]}
                          numberOfLines={2}
                        >
                          {proofLabel({
                            goalType: row.commitment.goalType,
                            proofUrl: row.checkIn.proofUrl,
                            proofPrompt: row.checkIn.proofPrompt,
                            submissionStatement: row.checkIn.submissionStatement,
                            stepCount: row.checkIn.stepCount,
                          })}
                        </Text>
                      </View>
                      <TextInput
                        value={reasons[checkInId] ?? ""}
                        onChangeText={(value) =>
                          setReasons((prev) => ({ ...prev, [checkInId]: value }))
                        }
                        placeholder="Rejection reason"
                        placeholderTextColor={colors.mutedForeground}
                        style={[
                          styles.input,
                          {
                            color: colors.foreground,
                            backgroundColor: colors.input,
                            borderColor: colors.border,
                          },
                        ]}
                        editable={!busy}
                      />
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => handleReject(checkInId)}
                          disabled={busy}
                          style={[
                            styles.actionBtn,
                            {
                              backgroundColor: colors.danger + "18",
                              borderColor: colors.danger + "33",
                              opacity: busy ? 0.5 : 1,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Feather name="x" size={15} color={colors.danger} />
                          <Text style={[styles.rejectText, { color: colors.danger }]}>
                            Reject
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleApprove(checkInId)}
                          disabled={busy}
                          style={[
                            styles.actionBtn,
                            {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary,
                              opacity: busy ? 0.5 : 1,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Feather name="check" size={15} color="#000" />
                          <Text style={styles.approveText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {tab === "refunds" && (
            <View style={styles.section}>
              {overview!.payoutBalances.length === 0 ? (
                <EmptyState
                  icon="send"
                  title="No refund balances"
                  body="Approved refund credits waiting for Razorpay disbursement will appear here."
                  colors={colors}
                />
              ) : (
                overview!.payoutBalances.map((row) => {
                  const key = `${row.user.id}:${row.currency}`;
                  const busy = busyId === key;
                  return (
                    <View
                      key={key}
                      style={[
                        styles.card,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <CardTop
                        icon="send"
                        title={row.user.label}
                        meta={row.user.phone ?? row.user.email ?? "No contact"}
                        amount={formatCurrency(row.amount, row.currency)}
                        amountColor={colors.primary}
                        colors={colors}
                      />
                      <TextInput
                        value={payoutRefs[key] ?? ""}
                        onChangeText={(value) =>
                          setPayoutRefs((prev) => ({ ...prev, [key]: value }))
                        }
                        placeholder="Razorpay refund or disbursement id"
                        placeholderTextColor={colors.mutedForeground}
                        style={[
                          styles.input,
                          {
                            color: colors.foreground,
                            backgroundColor: colors.input,
                            borderColor: colors.border,
                          },
                        ]}
                        editable={!busy}
                      />
                      <TextInput
                        value={payoutNotes[key] ?? ""}
                        onChangeText={(value) =>
                          setPayoutNotes((prev) => ({ ...prev, [key]: value }))
                        }
                        placeholder="Internal note"
                        placeholderTextColor={colors.mutedForeground}
                        style={[
                          styles.input,
                          {
                            color: colors.foreground,
                            backgroundColor: colors.input,
                            borderColor: colors.border,
                          },
                        ]}
                        editable={!busy}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          handlePayout(row.user.id, row.currency, row.amount)
                        }
                        disabled={busy}
                        style={[
                          styles.primaryBtn,
                          {
                            backgroundColor: colors.primary,
                            opacity: busy ? 0.5 : 1,
                          },
                        ]}
                        activeOpacity={0.84}
                      >
                        <Feather name="check" size={15} color="#000" />
                        <Text style={styles.primaryBtnText}>Mark refunded</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {tab === "ledger" && (
            <View style={styles.section}>
              {overview!.recentLedger.map((entry) => (
                <View
                  key={entry.id}
                  style={[
                    styles.ledgerRow,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.ledgerLeft}>
                    <Text style={[styles.ledgerTitle, { color: colors.foreground }]}>
                      {ledgerLabel(entry.type)} · {entry.user.label}
                    </Text>
                    <Text
                      style={[styles.ledgerMeta, { color: colors.mutedForeground }]}
                    >
                      {entry.commitment?.name ?? entry.destination} ·{" "}
                      {new Date(entry.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ledgerAmount,
                      {
                        color:
                          entry.type === "forfeited"
                            ? colors.danger
                            : entry.type === "manual_payout"
                            ? colors.accent
                            : colors.primary,
                      },
                    ]}
                  >
                    {formatCurrency(entry.amount, entry.currency)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function CardTop({
  icon,
  title,
  meta,
  amount,
  amountColor,
  colors,
}: {
  icon: string;
  title: string;
  meta: string;
  amount: string;
  amountColor: string;
  colors: any;
}) {
  return (
    <View style={styles.cardTop}>
      <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={15} color={colors.mutedForeground} />
      </View>
      <View style={styles.cardTitleBlock}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  body,
  colors,
}: {
  icon: string;
  title: string;
  body: string;
  colors: any;
}) {
  return (
    <View style={styles.emptyCard}>
      <Feather name={icon as any} size={28} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 104,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center", flex: 1 },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  scroll: {
    padding: 16,
    gap: 14,
  },
  tabs: {
    gap: 8,
    paddingBottom: 2,
  },
  tab: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  section: { gap: 12 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleBlock: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  amount: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  proofBox: {
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  proofText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  rejectText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  approveText: {
    color: "#000",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  primaryBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
  ledgerRow: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ledgerLeft: { flex: 1 },
  ledgerTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  ledgerMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  ledgerAmount: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
