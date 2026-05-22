import type { WithSpringConfig, WithTimingConfig } from "react-native-reanimated";
import { Easing, ReduceMotion } from "react-native-reanimated";

const standardEasing = Easing.bezier(0.22, 1, 0.36, 1);

export const motion = {
  duration: {
    fast: 120,
    base: 200,
    viewSwap: 220,
    reveal: 220,
  },
  distance: {
    viewSwap: 24,
  },
  easing: {
    standard: standardEasing,
  },
  timing: {
    fast: {
      duration: 120,
      easing: standardEasing,
      reduceMotion: ReduceMotion.System,
    } satisfies WithTimingConfig,
    base: {
      duration: 200,
      easing: standardEasing,
      reduceMotion: ReduceMotion.System,
    } satisfies WithTimingConfig,
    reveal: {
      duration: 220,
      easing: standardEasing,
      reduceMotion: ReduceMotion.System,
    } satisfies WithTimingConfig,
  },
  spring: {
    indicator: {
      duration: 240,
      dampingRatio: 1,
      overshootClamping: true,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    press: {
      duration: 120,
      dampingRatio: 1,
      overshootClamping: true,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
  },
} as const;
