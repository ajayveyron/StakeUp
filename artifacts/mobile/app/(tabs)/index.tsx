import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckInModal } from "@/components/CheckInModal";
import { CommitmentCard } from "@/components/CommitmentCard";
import { Commitment, useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  formatCountdown,
  formatCurrency,
  getMsUntilDeadline,
  getTodayStr,
  getTotalRefunded,
  hasTodayCheckIn,
  isActive,
  isTodayScheduled,
  getTotalCommittedDays,
  getVerifiedCheckIns,
} from "@/utils/commitment";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { commitments, submitContentCheckIn, submitStepsCheckIn } =
    useCommitments();

  const [selectedCommitment, setSelectedCommitment] =
    useState<Commitment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(getMsUntilDeadline());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getMsUntilDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const today = getTodayStr();
  const activeCommitments = commitments.filter(isActive);
  const todayPending = activeCommitments.filter(
    (c) => isTodayScheduled(c) && !hasTodayCheckIn(c)
  );
  const todayDone = activeCommitments.filter(
    (c) => isTodayScheduled(c) && hasTodayCheckIn(c)
  );
  const todayNotScheduled = activeCommitments.filter(
    (c) => !isTodayScheduled(c)
  );

  const totalStaked = commitments.reduce((s, c) => s + c.stakeAmount, 0);
  const totalRefunded = commitments.reduce((s, c) => s + getTotalRefunded(c), 0);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  function openCheckIn(commitment: Commitment) {
    setSelectedCommitment(commitment);
    setModalVisible(true);
  }

  function handleSubmitContent(id: string, date: string, url: string) {
    submitContentCheckIn(id, date, url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleSubmitSteps(id: string, date: string, steps: number) {
    submitStepsCheckIn(id, date, steps);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const isUrgent = countdown < 3600000; // less than 1 hour

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
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {greeting}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Your Stakes
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/commitment/new")}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {commitments.length > 0 && (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>
                  {formatCurrency(totalRefunded)}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.mutedForeground }]}
                >
                  Refunded
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: colors.accent }]}>
                  {formatCurrency(totalStaked - totalRefunded)}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.mutedForeground }]}
                >
                  At risk
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.summaryStat}>
                <Text
                  style={[styles.summaryValue, { color: colors.foreground }]}
                >
                  {todayPending.length}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.mutedForeground }]}
                >
                  Due today
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Deadline banner when pending */}
        {todayPending.length > 0 && (
          <View
            style={[
              styles.deadlineBanner,
              {
                backgroundColor: isUrgent
                  ? colors.danger + "22"
                  : colors.secondary,
                borderColor: isUrgent
                  ? colors.danger + "55"
                  : colors.border,
              },
            ]}
          >
            <Feather
              name="clock"
              size={13}
              color={isUrgent ? colors.danger : colors.mutedForeground}
            />
            <Text
              style={[
                styles.deadlineText,
                {
                  color: isUrgent ? colors.danger : colors.mutedForeground,
                },
              ]}
            >
              {formatCountdown(countdown)} · Submit by 11:59 PM
            </Text>
          </View>
        )}

        {/* Today pending */}
        {todayPending.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Submit today
            </Text>
            <Text style={[styles.sectionSub, { color: colors.danger }]}>
              {todayPending.length} pending
            </Text>
            {todayPending.map((c) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                onCheckIn={openCheckIn}
              />
            ))}
          </View>
        )}

        {/* Today done */}
        {todayDone.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Done today
            </Text>
            <Text style={[styles.sectionSub, { color: colors.primary }]}>
              {todayDone.length} submitted
            </Text>
            {todayDone.map((c) => (
              <CommitmentCard key={c.id} commitment={c} compact />
            ))}
          </View>
        )}

        {/* Not scheduled today */}
        {todayNotScheduled.length > 0 && todayPending.length === 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Rest day
            </Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              These commitments don't run today
            </Text>
            {todayNotScheduled.map((c) => (
              <CommitmentCard key={c.id} commitment={c} compact />
            ))}
          </View>
        )}

        {/* Empty state */}
        {commitments.length === 0 && (
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="target" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No stakes yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Put real money on your goals. Show up, post your proof, and get
              your money back.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/commitment/new")}
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Text style={styles.createBtnText}>Create your first stake</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CheckInModal
        visible={modalVisible}
        commitment={selectedCommitment}
        date={today}
        onClose={() => setModalVisible(false)}
        onSubmitContent={handleSubmitContent}
        onSubmitSteps={handleSubmitSteps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryStat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  deadlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 18,
  },
  deadlineText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  createBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
});
