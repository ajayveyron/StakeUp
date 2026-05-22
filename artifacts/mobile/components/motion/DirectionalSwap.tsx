import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
  ReduceMotion,
  useReducedMotion,
} from "react-native-reanimated";

import { motion } from "@/motion/tokens";

export type MotionDirection = -1 | 0 | 1;

type DirectionalSwapProps = {
  children: React.ReactNode;
  direction: MotionDirection;
  style?: StyleProp<ViewStyle>;
  transitionKey: string;
};

export function DirectionalSwap({
  children,
  direction,
  style,
  transitionKey,
}: DirectionalSwapProps) {
  const reduceMotion = useReducedMotion();
  const useFade = reduceMotion || direction === 0;

  const entering = (
    useFade ? FadeIn : direction > 0 ? FadeInRight : FadeInLeft
  )
    .duration(motion.duration.viewSwap)
    .easing(motion.easing.standard)
    .reduceMotion(ReduceMotion.System);
  const exiting = (
    useFade ? FadeOut : direction > 0 ? FadeOutLeft : FadeOutRight
  )
    .duration(motion.duration.base)
    .easing(motion.easing.standard)
    .reduceMotion(ReduceMotion.System);
  const layout = reduceMotion
    ? undefined
    : LinearTransition.duration(motion.duration.base)
        .easing(motion.easing.standard)
        .reduceMotion(ReduceMotion.System);

  return (
    <Animated.View
      key={transitionKey}
      entering={entering}
      exiting={exiting}
      layout={layout}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
