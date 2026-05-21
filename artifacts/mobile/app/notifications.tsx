import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
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

import { BrutalistBackdrop } from "@/components/BrutalistBackdrop";
import { useColors } from "@/hooks/useColors";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

type NotificationItem = {
  id: string;
  type:
    | "payment_pending"
    | "payment_confirmed"
    | "payment_discarded"
    | "check_in_approved"
    | "check_in_rejected"
    | "manual_payout_recorded";
  title: string;
  body: string;
  route?: string;
  readAt?: string;
  createdAt: string;
};

function iconFor(type: NotificationItem["type"]) {
  if (type === "payment_pending") return "credit-card";
  if (type === "payment_confirmed") return "unlock";
  if (type === "payment_discarded") return "archive";
  if (type === "check_in_approved") return "check-circle";
  if (type === "check_in_rejected") return "x-circle";
  return "send";
}

function toneFor(type: NotificationItem["type"], colors: ReturnType<typeof useColors>) {
  if (type === "check_in_rejected" || type === "payment_discarded") {
    return colors.danger;
  }
  if (type === "payment_pending") return colors.accent;
  return colors.primary;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const notifications = (useQuery(api.notifications.listMine) ??
    []) as NotificationItem[];
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  function openNotification(item: NotificationItem) {
    void markRead({
      notificationId: item.id as Id<"notifications">,
    }).catch(console.error);
    if (item.route) router.push(item.route as never);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrutalistBackdrop />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPadding + 16,
            paddingBottom: Platform.OS === "web" ? 34 : 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            activeOpacity={0.76}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
              Inbox
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              The Raven's Notes
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => void markAllRead().catch(console.error)}
            disabled={unreadCount === 0}
            style={[
              styles.markBtn,
              {
                backgroundColor:
                  unreadCount > 0 ? colors.primary : colors.secondary,
              },
            ]}
            activeOpacity={0.78}
          >
            <Feather
              name="check"
              size={14}
              color={unreadCount > 0 ? "#000" : colors.mutedForeground}
            />
            <Text
              style={[
                styles.markText,
                { color: unreadCount > 0 ? "#000" : colors.mutedForeground },
              ]}
            >
              Read
            </Text>
          </TouchableOpacity>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="bell" size={38} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No notes yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Payment updates, proof decisions, and refund receipts will be recorded here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((item) => {
              const tone = toneFor(item.type, colors);
              const unread = !item.readAt;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => openNotification(item)}
                  activeOpacity={0.82}
                  style={[
                    styles.card,
                    {
                      backgroundColor: unread
                        ? tone + "14"
                        : colors.card,
                      borderColor: unread ? tone + "55" : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: tone + "1F" },
                    ]}
                  >
                    <Feather
                      name={iconFor(item.type)}
                      size={17}
                      color={tone}
                    />
                  </View>
                  <View style={styles.cardCopy}>
                    <View style={styles.cardTitleRow}>
                      <Text
                        style={[
                          styles.cardTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        {item.title}
                      </Text>
                      {unread && (
                        <View style={[styles.dot, { backgroundColor: tone }]} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.cardBody,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {item.body}
                    </Text>
                    <Text
                      style={[
                        styles.cardTime,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {formatTimestamp(item.createdAt)}
                    </Text>
                  </View>
                  {item.route && (
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={colors.mutedForeground}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
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
    gap: 12,
    marginBottom: 20,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  kicker: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  markBtn: {
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  markText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  empty: {
    alignItems: "center",
    paddingTop: 90,
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
    paddingHorizontal: 28,
  },
  list: { gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, gap: 6 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  cardTime: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
