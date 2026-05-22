import React, { useEffect, useState } from "react";
import {
  LayoutRectangle,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/motion/tokens";

type IndicatorFrame = Pick<LayoutRectangle, "x" | "y" | "width" | "height">;

type SlidingIndicatorProps = {
  frameForLayout?: (layout: LayoutRectangle) => IndicatorFrame;
  hidden?: boolean;
  layouts: Record<string, LayoutRectangle | undefined>;
  selectedKey: string;
  style?: StyleProp<ViewStyle>;
};

export function SlidingIndicator({
  frameForLayout,
  hidden = false,
  layouts,
  selectedKey,
  style,
}: SlidingIndicatorProps) {
  const reduceMotion = useReducedMotion();
  const [hasFrame, setHasFrame] = useState(false);
  const layout = layouts[selectedKey];
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (hidden || !layout) {
      opacity.value = withTiming(0, motion.timing.fast);
      return;
    }

    const frame = frameForLayout?.(layout) ?? layout;
    const shouldSnap = reduceMotion || !hasFrame;

    x.value = shouldSnap
      ? frame.x
      : withSpring(frame.x, motion.spring.indicator);
    y.value = shouldSnap
      ? frame.y
      : withSpring(frame.y, motion.spring.indicator);
    width.value = shouldSnap
      ? frame.width
      : withSpring(frame.width, motion.spring.indicator);
    height.value = shouldSnap
      ? frame.height
      : withSpring(frame.height, motion.spring.indicator);
    opacity.value = withTiming(1, motion.timing.fast);

    if (!hasFrame) setHasFrame(true);
  }, [
    frameForLayout,
    hasFrame,
    height,
    hidden,
    layout,
    opacity,
    reduceMotion,
    width,
    x,
    y,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
    width: width.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.indicator, animatedStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
