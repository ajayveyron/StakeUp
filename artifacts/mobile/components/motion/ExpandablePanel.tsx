import React, { useEffect, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/motion/tokens";

type ExpandablePanelProps = {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  expanded: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ExpandablePanel({
  children,
  contentStyle,
  expanded,
  style,
}: ExpandablePanelProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(expanded ? 1 : 0);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    progress.value = reduceMotion
      ? expanded
        ? 1
        : 0
      : withTiming(expanded ? 1 : 0, motion.timing.reveal);
  }, [expanded, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: contentHeight * progress.value,
    opacity: progress.value,
  }));

  return (
    <Animated.View
      pointerEvents={expanded ? "auto" : "none"}
      style={[styles.panel, animatedStyle, style]}
    >
      <View
        onLayout={(event) => {
          const nextHeight = event.nativeEvent.layout.height;
          setContentHeight((current) =>
            Math.abs(current - nextHeight) < 0.5 ? current : nextHeight,
          );
        }}
        style={contentStyle}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: "hidden",
  },
});
