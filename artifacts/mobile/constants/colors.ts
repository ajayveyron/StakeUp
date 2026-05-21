const colors = {
  light: {
    text: "#F8F3D4",
    tint: "#FFD800",
    background: "#050505",
    foreground: "#F8F3D4",
    card: "#0D0D0A",
    cardForeground: "#F8F3D4",
    primary: "#FFD800",
    primaryForeground: "#000000",
    secondary: "#171713",
    secondaryForeground: "#F8F3D4",
    muted: "#171713",
    mutedForeground: "#A7A078",
    accent: "#F8F3D4",
    accentForeground: "#000000",
    destructive: "#FF4D2E",
    destructiveForeground: "#050505",
    border: "rgba(255,216,0,0.24)",
    input: "#11110E",
    success: "#FFD800",
    warning: "#F8F3D4",
    danger: "#FF4D2E",
  },
  radius: 8,
};

export const gradients = {
  primary: ["#FFD800", "#FFD800"] as const,
  accent: ["#F8F3D4", "#F8F3D4"] as const,
  danger: ["#FF4D2E", "#FF4D2E"] as const,
  cardActive: ["rgba(255,216,0,0.42)", "rgba(255,216,0,0.07)"] as const,
  cardMuted: ["rgba(23,23,19,0.92)", "rgba(23,23,19,0.92)"] as const,
  tabBar: [
    "transparent",
    "#FFD800",
    "#FFD800",
    "#F8F3D4",
    "transparent",
  ] as const,
};

export default colors;
