const colors = {
  light: {
    text: "#FFFFFF",
    tint: "#00C853",
    background: "#0A0A0F",
    foreground: "#FFFFFF",
    card: "#111116",
    cardForeground: "#FFFFFF",
    primary: "#00C853",
    primaryForeground: "#000000",
    secondary: "#1A1A22",
    secondaryForeground: "#FFFFFF",
    muted: "#1A1A22",
    mutedForeground: "#8A8A9A",
    accent: "#FF9F0A",
    accentForeground: "#000000",
    destructive: "#FF3B30",
    destructiveForeground: "#FFFFFF",
    border: "#222230",
    input: "#1A1A22",
    success: "#00C853",
    warning: "#FF9F0A",
    danger: "#FF3B30",
  },
  radius: 14,
};

export const gradients = {
  primary: ["#00C853", "#00E676"] as const,
  accent: ["#FF9F0A", "#FFB340"] as const,
  danger: ["#FF3B30", "#FF6961"] as const,
  cardActive: ["rgba(0,200,83,0.38)", "rgba(0,200,83,0.06)"] as const,
  cardMuted: ["rgba(26,26,34,0.85)", "rgba(26,26,34,0.85)"] as const,
  tabBar: [
    "transparent",
    "#00C853",
    "#00E676",
    "#FF9F0A",
    "transparent",
  ] as const,
};

export default colors;
