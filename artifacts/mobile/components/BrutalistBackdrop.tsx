import React from "react";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function BrutalistBackdrop() {
  const colors = useColors();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.ring,
          {
            borderColor: colors.primary,
          },
        ]}
      />
      <View
        style={[
          styles.block,
          {
            backgroundColor: colors.primary,
          },
        ]}
      />
      <View
        style={[
          styles.slab,
          {
            backgroundColor: colors.primary,
          },
        ]}
      />
      <View
        style={[
          styles.grainA,
          {
            borderColor: colors.primary,
          },
        ]}
      />
      <View
        style={[
          styles.grainB,
          {
            borderColor: colors.foreground,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    top: 92,
    right: -58,
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 24,
    opacity: 0.12,
  },
  block: {
    position: "absolute",
    left: -34,
    bottom: 142,
    width: 108,
    height: 108,
    opacity: 0.08,
    transform: [{ rotate: "14deg" }],
  },
  slab: {
    position: "absolute",
    right: 24,
    bottom: 70,
    width: 168,
    height: 18,
    opacity: 0.13,
    transform: [{ rotate: "-8deg" }],
  },
  grainA: {
    position: "absolute",
    top: 0,
    left: -20,
    right: -20,
    height: "100%",
    borderWidth: 1,
    opacity: 0.04,
    transform: [{ rotate: "4deg" }],
  },
  grainB: {
    position: "absolute",
    top: -40,
    left: 72,
    width: 1,
    height: "130%",
    borderLeftWidth: 1,
    opacity: 0.06,
    transform: [{ rotate: "-12deg" }],
  },
});
