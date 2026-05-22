import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  type LayoutRectangle,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrutalistBackdrop } from "@/components/BrutalistBackdrop";
import { CommitmentCard } from "@/components/CommitmentCard";
import {
  DirectionalSwap,
  type MotionDirection,
} from "@/components/motion/DirectionalSwap";
import { MotionPressable } from "@/components/motion/MotionPressable";
import { SlidingIndicator } from "@/components/motion/SlidingIndicator";
import { useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import { useFirstName } from "@/hooks/useCurrentUser";
import { isActive, isExpired, isPendingPayment } from "@/utils/commitment";

type Tab = "pending" | "active" | "past";

const TABS: Tab[] = ["pending", "active", "past"];
const TAB_ORDER: Record<Tab, number> = {
  pending: 0,
  active: 1,
  past: 2,
};

function layoutsMatch(a: LayoutRectangle | undefined, b: LayoutRectangle) {
  if (!a) return false;
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

export default function CommitmentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { commitments } = useCommitments();
  const firstName = useFirstName();
  const [tab, setTab] = useState<Tab>("active");
  const [tabDirection, setTabDirection] = useState<MotionDirection>(0);
  const [tabLayouts, setTabLayouts] = useState<
    Record<string, LayoutRectangle | undefined>
  >({});

  const pending = commitments.filter(isPendingPayment);
  const active = commitments.filter(isActive);
  const past = commitments.filter(isExpired);
  const displayed = tab === "pending" ? pending : tab === "active" ? active : past;
  const topPadding = Platform.OS === "web" ? 12 : insets.top;

  const updateTabLayout = useCallback((key: string, layout: LayoutRectangle) => {
    setTabLayouts((current) => {
      if (layoutsMatch(current[key], layout)) return current;
      return { ...current, [key]: layout };
    });
  }, []);

  function selectTab(nextTab: Tab) {
    if (nextTab === tab) return;
    setTabDirection(TAB_ORDER[nextTab] > TAB_ORDER[tab] ? 1 : -1);
    setTab(nextTab);
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
          <Text style={[styles.title, { color: colors.foreground }]}>
            Pacts
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/commitment/new")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create pact"
          >
            <LinearGradient
              colors={[colors.primary, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addBtn}
            >
              <Feather
                name="plus"
                size={20}
                color={colors.primaryForeground}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View
          style={[
            styles.tabBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SlidingIndicator
            selectedKey={tab}
            layouts={tabLayouts}
            style={[styles.tabIndicator, { backgroundColor: colors.primary }]}
          />
          {TABS.map((t) => (
            <MotionPressable
              key={t}
              onLayout={(event) => updateTabLayout(t, event.nativeEvent.layout)}
              onPress={() => selectTab(t)}
              pressedOpacity={0.9}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      tab === t
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                    fontFamily:
                      tab === t ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {t === "pending"
                  ? `Drafts (${pending.length})`
                  : t === "active"
                  ? `Live (${active.length})`
                  : `Closed (${past.length})`}
              </Text>
            </MotionPressable>
          ))}
        </View>

        <DirectionalSwap direction={tabDirection} transitionKey={tab}>
          {displayed.length === 0 ? (
            <View style={styles.empty}>
              <Feather
                name={tab === "active" ? "target" : "archive"}
                size={36}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {tab === "pending"
                  ? "No draft pacts"
                  : tab === "active"
                  ? firstName
                    ? `Ready to commit, ${firstName}?`
                    : "No live pacts"
                  : "No closed pacts"}
              </Text>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                {tab === "pending"
                  ? "Pacts waiting for a Pact Pass and deposit will appear here."
                  : tab === "active"
                  ? "Lock money. Show proof."
                  : "Finished records will appear here."}
              </Text>
              {tab === "active" && (
                <TouchableOpacity
                  onPress={() => router.push("/commitment/new")}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createBtn}
                  >
                    <Text style={styles.createBtnText}>Make a Pact</Text>
                  </LinearGradient>
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
        </DirectionalSwap>
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
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  tabIndicator: {
    borderRadius: 8,
    zIndex: 0,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    zIndex: 1,
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
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
