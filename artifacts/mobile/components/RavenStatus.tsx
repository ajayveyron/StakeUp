import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { adminWhatsAppUrl } from "@/utils/whatsapp";

export type RavenServiceState = "working" | "limited" | "down" | "checking";

export type RavenService = {
  label: string;
  detail: string;
  state: RavenServiceState;
};

type RavenStatusProps = {
  title: string;
  message: string;
  services: RavenService[];
  contactMessage: string;
  onRetry?: () => void;
  retryLabel?: string;
};

const STATE_META: Record<
  RavenServiceState,
  { label: string; icon: keyof typeof Feather.glyphMap }
> = {
  working: { label: "Working", icon: "check-circle" },
  limited: { label: "Limited", icon: "alert-circle" },
  down: { label: "Down", icon: "x-circle" },
  checking: { label: "Checking", icon: "loader" },
};

function statusColor(state: RavenServiceState, colors: ReturnType<typeof useColors>) {
  if (state === "working") return colors.success;
  if (state === "down") return colors.danger;
  if (state === "limited") return colors.warning;
  return colors.mutedForeground;
}

function hasServiceIssue(services: RavenService[]) {
  return services.some(
    (service) => service.state === "limited" || service.state === "down",
  );
}

function contactAdmin(message: string) {
  void Linking.openURL(adminWhatsAppUrl(message));
}

export function RavenStatusChip({
  services,
  contactMessage,
  showWhenHealthy = false,
}: {
  services: RavenService[];
  contactMessage: string;
  showWhenHealthy?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const issueCount = services.filter(
    (service) => service.state === "limited" || service.state === "down",
  ).length;
  const hasIssues = issueCount > 0;
  const chipColor = hasIssues ? colors.danger : colors.success;
  const chipIcon = hasIssues ? "alert-triangle" : "check-circle";

  if (!showWhenHealthy && !hasIssues) return null;

  return (
    <>
      <Pressable
        accessibilityLabel="Open Raven service status"
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        <Feather name={chipIcon} size={14} color={chipColor} />
        <Text style={[styles.chipText, { color: colors.foreground }]}>
          Raven status
        </Text>
        <Feather name="chevron-up" size={14} color={colors.mutedForeground} />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityLabel="Close Raven service status"
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 18,
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                  Raven Status
                </Text>
                <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                  The Raven records what still works.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close status sheet"
                accessibilityRole="button"
                onPress={() => setOpen(false)}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    backgroundColor: colors.muted,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="x" size={18} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.serviceList}
              contentContainerStyle={styles.serviceListContent}
              showsVerticalScrollIndicator={false}
            >
              {services.map((service) => {
                const meta = STATE_META[service.state];
                const color = statusColor(service.state, colors);
                return (
                  <View
                    key={service.label}
                    style={[
                      styles.serviceRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Feather name={meta.icon} size={18} color={color} />
                    <View style={styles.serviceCopy}>
                      <Text style={[styles.serviceLabel, { color: colors.foreground }]}>
                        {service.label}
                      </Text>
                      <Text style={[styles.serviceDetail, { color: colors.mutedForeground }]}>
                        {service.detail}
                      </Text>
                    </View>
                    <Text style={[styles.stateLabel, { color }]}>{meta.label}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {hasServiceIssue(services) ? (
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => contactAdmin(contactMessage)}
                style={[styles.contactButton, { backgroundColor: colors.primary }]}
              >
                <Feather name="message-circle" size={17} color={colors.primaryForeground} />
                <Text style={[styles.contactText, { color: colors.primaryForeground }]}>
                  Contact admin
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

export function RavenStatusScreen({
  title,
  message,
  services,
  contactMessage,
  onRetry,
  retryLabel = "Retry",
}: RavenStatusProps) {
  const colors = useColors();
  const contactVisible = useMemo(() => hasServiceIssue(services), [services]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.screenContent}>
        <View
          style={[
            styles.statusMark,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="alert-triangle" size={24} color={colors.danger} />
        </View>

        <Text style={[styles.screenTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        <Text style={[styles.screenMessage, { color: colors.mutedForeground }]}>
          {message}
        </Text>

        <RavenStatusChip services={services} contactMessage={contactMessage} />

        <View style={styles.actionRow}>
          {onRetry ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={onRetry}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="refresh-cw" size={16} color={colors.foreground} />
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>
                {retryLabel}
              </Text>
            </TouchableOpacity>
          ) : null}

          {contactVisible ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => contactAdmin(contactMessage)}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
              <Feather name="message-circle" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>
                Contact admin
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const SESSION_STATUS_SERVICES: RavenService[] = [
  {
    label: "View pact record",
    detail: "Your saved pact data remains on Pact Raven.",
    state: "working",
  },
  {
    label: "Account session",
    detail: "Clerk signed in, but Convex has not accepted the session yet.",
    state: "limited",
  },
  {
    label: "Pact database",
    detail: "The app is waiting for a confirmed backend connection.",
    state: "checking",
  },
  {
    label: "Pact purchase",
    detail: "Pact Pass checkout pauses until the session reconnects.",
    state: "limited",
  },
  {
    label: "Start a pact",
    detail: "New pacts pause until the session reconnects.",
    state: "limited",
  },
  {
    label: "Pact submission",
    detail: "Proof submission pauses until the session reconnects.",
    state: "limited",
  },
  {
    label: "Proof review",
    detail: "Submitted proof already in review stays recorded.",
    state: "working",
  },
  {
    label: "Refunds",
    detail: "Refund credit stays recorded server-side.",
    state: "working",
  },
  {
    label: "Payment checkout",
    detail: "Razorpay checkout waits for the backend session.",
    state: "limited",
  },
];

export const HEALTHY_STATUS_SERVICES: RavenService[] = [
  {
    label: "Account session",
    detail: "Clerk and Convex have accepted the current session.",
    state: "working",
  },
  {
    label: "Pact database",
    detail: "Pact records are available.",
    state: "working",
  },
  {
    label: "Backend functions",
    detail: "Pact Raven backend calls are available.",
    state: "working",
  },
  {
    label: "Pact purchase",
    detail: "Pact Pass checkout can be started.",
    state: "working",
  },
  {
    label: "Start a pact",
    detail: "New pact records can be created.",
    state: "working",
  },
  {
    label: "Pact submission",
    detail: "Proof can be submitted on active pact days.",
    state: "working",
  },
  {
    label: "Proof review",
    detail: "Submitted proof can reach admin review.",
    state: "working",
  },
  {
    label: "Refunds",
    detail: "Refund credit and payout requests are available.",
    state: "working",
  },
  {
    label: "Payment checkout",
    detail: "Razorpay checkout is ready when payment is needed.",
    state: "working",
  },
];

export const ACCOUNT_STATUS_SERVICES: RavenService[] = [
  {
    label: "Your data is safe",
    detail: "Signed pact records remain on Pact Raven.",
    state: "working",
  },
  {
    label: "Pact database",
    detail: "The account record could not be prepared right now.",
    state: "down",
  },
  {
    label: "Backend functions",
    detail: "The app could not finish the account setup call.",
    state: "limited",
  },
  {
    label: "Pact purchase",
    detail: "Pact Pass checkout pauses until account setup finishes.",
    state: "limited",
  },
  {
    label: "Start a pact",
    detail: "New pacts pause until account setup finishes.",
    state: "limited",
  },
  {
    label: "Pact submission",
    detail: "Proof submission pauses until account setup finishes.",
    state: "limited",
  },
  {
    label: "Proof review",
    detail: "Admin review records stay server-side.",
    state: "working",
  },
  {
    label: "Refunds",
    detail: "Approved refund credit is not removed by this issue.",
    state: "working",
  },
  {
    label: "Payment checkout",
    detail: "Razorpay checkout requires the account record first.",
    state: "limited",
  },
];

export const SETUP_STATUS_SERVICES: RavenService[] = [
  {
    label: "Account sign in",
    detail: "Clerk or Convex mobile environment values are missing.",
    state: "down",
  },
  {
    label: "Pact database",
    detail: "The app cannot reach the configured Convex deployment.",
    state: "down",
  },
  {
    label: "Backend functions",
    detail: "Convex functions are unavailable without mobile env values.",
    state: "down",
  },
  {
    label: "Pact purchase",
    detail: "Checkout requires the backend session first.",
    state: "limited",
  },
  {
    label: "Start a pact",
    detail: "New pacts require backend setup.",
    state: "limited",
  },
  {
    label: "Pact submission",
    detail: "Proof submission requires backend setup.",
    state: "limited",
  },
  {
    label: "Proof review",
    detail: "Admin review cannot receive new proof until setup is fixed.",
    state: "limited",
  },
  {
    label: "Refunds",
    detail: "Refund credit requires backend access.",
    state: "limited",
  },
  {
    label: "Payment checkout",
    detail: "Razorpay checkout cannot start before backend setup.",
    state: "limited",
  },
];

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(27,29,36,0.28)",
  },
  sheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 14,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(115,121,133,0.35)",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  sheetSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceList: {
    flexGrow: 0,
  },
  serviceListContent: {
    gap: 8,
  },
  serviceRow: {
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  serviceCopy: {
    flex: 1,
    gap: 3,
  },
  serviceLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  serviceDetail: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Inter_400Regular",
  },
  stateLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  contactButton: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  screenContent: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 14,
  },
  statusMark: {
    width: 54,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  screenMessage: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  actionRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
