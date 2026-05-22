import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Easing, Platform, StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { gradients } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="commitments">
        <Icon sf={{ default: "target", selected: "target" }} />
        <Label>Pacts</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        animation: reduceMotion ? "none" : "shift",
        sceneStyleInterpolator: reduceMotion
          ? undefined
          : ({ current }) => ({
              sceneStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [0.94, 1, 0.94],
                }),
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: [-28, 0, 28],
                    }),
                  },
                ],
              },
            }),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        transitionSpec: reduceMotion
          ? { animation: "timing", config: { duration: 0 } }
          : {
              animation: "timing",
              config: {
                duration: 220,
                easing: Easing.out(Easing.cubic),
              },
            },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: isWeb ? 84 : 60,
        },
        tabBarBackground: () =>
          isIOS ? (
            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={gradients.tabBar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 1.5 }}
              />
              <BlurView
                intensity={100}
                tint="light"
                style={{ flex: 1 }}
              />
            </View>
          ) : isWeb ? (
            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={gradients.tabBar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 1.5 }}
              />
              <View
                style={{ flex: 1, backgroundColor: "rgba(247, 248, 250, 0.97)" }}
              />
            </View>
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          title: "Pacts",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="target" tintColor={color} size={24} />
            ) : (
              <Feather name="target" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
