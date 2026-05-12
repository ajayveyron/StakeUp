import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { CommitmentCard } from "@/components/CommitmentCard";
import { useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import {
  formatCurrency,
  getTodayStr,
  getTotalEarned,
  hasCheckedInToday,
  isActive,
} from "@/utils/commitment";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { commitments, checkIn } = useCommitments();

  const today = getTodayStr();
  const activeCommitments = commitments.filter(isActive);
  const todayPending = activeCommitments.filter((c) => !hasCheckedInToday(c));
  const todayDone = activeCommitments.filter(hasCheckedInToday);

  const totalStaked = commitments.reduce((s, c) => s + c.stakeAmount, 0);
  const totalEarned = commitments.reduce((s, c) => s + getTotalEarned(c), 0);
  const todayEarnings = todayDone.length > 0
    ? todayDone.reduce((s, c) => {
        const perCheckIn = c.stakeAmount / c.targetCount;
        return s + (hasCheckedInToday(c) ? perCheckIn : 0);
      }, 0)
    : 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  function handleCheckIn(id: string) {
    checkIn(id, today);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

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

        {/* Summary Card */}
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
                  {formatCurrency(totalEarned)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Total Earned
                </Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: colors.accent }]}>
                  {formatCurrency(totalStaked)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Total Staked
                </Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {activeCommitments.length}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Active
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Today's Check-ins */}
        {todayPending.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Check in today
            </Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              {todayPending.length} pending
            </Text>
            {todayPending.map((c) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                onCheckIn={handleCheckIn}
                compact={false}
              />
            ))}
          </View>
        )}

        {todayDone.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Done today
            </Text>
            <Text style={[styles.sectionSub, { color: colors.primary }]}>
              +{formatCurrency(todayEarnings)} earned
            </Text>
            {todayDone.map((c) => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                compact={true}
              />
            ))}
          </View>
        )}

        {commitments.length === 0 && (
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="target" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No commitments yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Put real money on your goals and earn it back each day you show up.
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
    marginBottom: 24,
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
  section: {
    marginBottom: 24,
  },
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
