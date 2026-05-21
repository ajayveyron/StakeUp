import { Feather } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { api } from "@convex/_generated/api";

export function NotificationButton() {
  const colors = useColors();
  const router = useRouter();
  const unreadCount = useQuery(api.notifications.unreadCount) ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications" as never)}
      style={[styles.button, { backgroundColor: colors.secondary }]}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Feather name="bell" size={17} color={colors.mutedForeground} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    minWidth: 17,
    height: 17,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: -2,
    right: -2,
  },
  badgeText: {
    color: "#000",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
});
