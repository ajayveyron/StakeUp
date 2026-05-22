const colors = {
  light: {
    text: "#1B1D24",
    tint: "#1B1D24",
    background: "#F7F8FA",
    foreground: "#1B1D24",
    card: "#FFFFFF",
    cardForeground: "#1B1D24",
    primary: "#1B1D24",
    primaryForeground: "#FFFFFF",
    secondary: "#EEF1F5",
    secondaryForeground: "#1B1D24",
    muted: "#F1F3F6",
    mutedForeground: "#737985",
    accent: "#4E5D72",
    accentForeground: "#FFFFFF",
    destructive: "#C2412F",
    destructiveForeground: "#FFFFFF",
    border: "rgba(27,29,36,0.1)",
    input: "#FFFFFF",
    success: "#1F8A5B",
    warning: "#5F6F85",
    danger: "#C2412F",
  },
  radius: 8,
};

export const gradients = {
  primary: ["#1B1D24", "#1B1D24"] as const,
  accent: ["#4E5D72", "#4E5D72"] as const,
  danger: ["#C2412F", "#C2412F"] as const,
  cardActive: ["rgba(27,29,36,0.06)", "rgba(255,255,255,1)"] as const,
  cardMuted: ["#FFFFFF", "#FFFFFF"] as const,
  tabBar: [
    "transparent",
    "#1B1D24",
    "#1B1D24",
    "#FFFFFF",
    "transparent",
  ] as const,
};

export default colors;
