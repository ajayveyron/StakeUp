import * as WebBrowser from "expo-web-browser";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

export default function SsoCallbackScreen() {
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        Completing sign-in
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
