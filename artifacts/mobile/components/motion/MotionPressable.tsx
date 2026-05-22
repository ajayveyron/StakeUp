import React from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MotionPressableProps = Omit<PressableProps, "style"> & {
  children: React.ReactNode;
  pressedOpacity?: number;
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
};

export function MotionPressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressedOpacity = 0.86,
  pressedScale = 0.985,
  style,
  ...props
}: MotionPressableProps) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * (1 - pressedOpacity),
    transform: [{ scale: 1 - pressed.value * (1 - pressedScale) }],
  }));

  function setPressed(next: number) {
    pressed.value = reduceMotion
      ? withTiming(next, motion.timing.fast)
      : withSpring(next, motion.spring.press);
  }

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) setPressed(1);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!disabled) setPressed(0);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
