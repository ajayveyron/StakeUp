import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { isActive, isExpired } from "@/utils/commitment";

type Tab = "active" | "past";

export default function CommitmentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { commitments } = useCommitments();
  const [tab, setTab] = useState<Tab>("active");

  const active = commitments.filter(isActive);
  const past = commitments.filter(isExpired);
  const displayed = tab === "active" ? active : past;
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
            Commitments
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/commitment/new")}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View
          style={[
            styles.tabBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {(["active", "past"] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tabItem,
                tab === t && { backgroundColor: colors.primary },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: tab === t ? "#000" : colors.mutedForeground,
                    fontFamily:
                      tab === t ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {t === "active"
                  ? `Active (${active.length})`
                  : `Past (${past.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {displayed.length === 0 ? (
          <View style={styles.empty}>
            <Feather
              name={tab === "active" ? "target" : "archive"}
              size={36}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {tab === "active" ? "No active stakes" : "No past stakes"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {tab === "active"
                ? "Create a commitment and start getting refunds for every day you show up."
                : "Completed stakes will appear here."}
            </Text>
            {tab === "active" && (
              <TouchableOpacity
                onPress={() => router.push("/commitment/new")}
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={styles.createBtnText}>New Stake</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View>
            {displayed.map((c) => (
              <CommitmentCard key={c.id} commitment={c} />
            ))}
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
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  tabText: { fontSize: 13 },
  empty: {
    alignItems: "center",
    paddingTop: 60,
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
  createBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },
  createBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
});
