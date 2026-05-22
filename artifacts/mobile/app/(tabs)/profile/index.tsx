import { useAuth } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrutalistBackdrop } from "@/components/BrutalistBackdrop";
import { NotificationButton } from "@/components/NotificationButton";
import { LEGAL_URLS } from "@/constants/links";
import { selectProfileAvatar } from "@/constants/profileAvatars";
import { useCommitments } from "@/contexts/CommitmentsContext";
import { useColors } from "@/hooks/useColors";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  formatCurrency,
  getAmountAtRisk,
  getTotalRefunded,
  isPendingPayment,
} from "@/utils/commitment";
import { normalizeWhatsAppNumber, whatsappNumberLabel } from "@/utils/whatsapp";

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const currentUser = useCurrentUser();
  const wallet = useQuery(api.wallet.getMine);
  const updateWhatsAppNumber = useMutation(api.users.updateWhatsAppNumber);
  const generateProfileImageUploadUrl = useMutation(
    api.users.generateProfileImageUploadUrl,
  );
  const updateCurrentUserProfileImage = useMutation(
    api.users.updateCurrentUserProfileImage,
  );
  const { commitments } = useCommitments();
  const [editingWhatsApp, setEditingWhatsApp] = useState(false);
  const [whatsAppInput, setWhatsAppInput] = useState("");
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  const topPadding = Platform.OS === "web" ? 12 : insets.top;
  const displayName = currentUser?.displayName?.trim() || "Pact Raven member";
  const email = currentUser?.email ?? "No email recorded";
  const whatsAppDisplay = whatsappNumberLabel(currentUser?.whatsappNumber);
  const joined = formatProfileDate(currentUser?.createdAt);
  const confirmedCommitments = commitments.filter((c) => !isPendingPayment(c));
  const totalAtRisk = confirmedCommitments.reduce(
    (sum, commitment) => sum + getAmountAtRisk(commitment),
    0,
  );
  const localRefundCredit = confirmedCommitments.reduce(
    (sum, commitment) => sum + getTotalRefunded(commitment),
    0,
  );
  const refundCredit = wallet?.availableToPayout ?? localRefundCredit;
  const avatarSource = currentUser?.imageUrl
    ? { uri: currentUser.imageUrl }
    : selectProfileAvatar(currentUser?._id ?? email ?? displayName);

  useEffect(() => {
    if (!editingWhatsApp) {
      setWhatsAppInput(currentUser?.whatsappNumber ?? "");
    }
  }, [currentUser?.whatsappNumber, editingWhatsApp]);

  function startWhatsAppEdit() {
    setWhatsAppInput(currentUser?.whatsappNumber ?? "");
    setEditingWhatsApp(true);
  }

  async function uploadProfileImage(asset: ImagePicker.ImagePickerAsset) {
    const body = asset.file ?? (await (await fetch(asset.uri)).blob());
    const contentType =
      asset.mimeType ||
      (body instanceof Blob ? body.type : undefined) ||
      "image/jpeg";
    const uploadUrl = await generateProfileImageUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
    });
    if (!response.ok) {
      throw new Error("Profile image upload failed");
    }
    const result = (await response.json()) as { storageId?: string };
    if (!result.storageId) {
      throw new Error("Profile image upload did not return a file id");
    }
    await updateCurrentUserProfileImage({
      storageId: result.storageId as Id<"_storage">,
    });
  }

  async function pickProfileImage() {
    if (updatingAvatar) return;
    setUpdatingAvatar(true);
    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          throw new Error("Photo library permission is required");
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
      });
      if (result.canceled || !result.assets?.[0]) return;

      await uploadProfileImage(result.assets[0]);
      Alert.alert(
        "Profile image saved",
        "The Raven will use this picture on your record.",
      );
    } catch (error) {
      Alert.alert(
        "Could not save profile image",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setUpdatingAvatar(false);
    }
  }

  async function saveWhatsAppNumber() {
    const normalized = normalizeWhatsAppNumber(whatsAppInput);
    if (!normalized || savingWhatsApp) {
      Alert.alert(
        "WhatsApp number needed",
        "Enter a valid WhatsApp mobile number before saving.",
      );
      return;
    }

    setSavingWhatsApp(true);
    try {
      await updateWhatsAppNumber({ whatsappNumber: normalized });
      setWhatsAppInput(normalized);
      setEditingWhatsApp(false);
      Alert.alert(
        "WhatsApp number saved",
        "Pact reminders and review updates will use this number when WhatsApp flows are ready.",
      );
    } catch (error) {
      Alert.alert(
        "Could not save WhatsApp number",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSavingWhatsApp(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrutalistBackdrop />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPadding + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Profile
          </Text>
          <NotificationButton />
        </View>

        <View
          style={[
            styles.identityCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.identityTop}>
            <TouchableOpacity
              onPress={pickProfileImage}
              disabled={updatingAvatar}
              style={styles.avatarButton}
              activeOpacity={0.78}
            >
              <Image source={avatarSource} style={styles.avatarImage} />
              <View
                style={[
                  styles.avatarEditBadge,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.card,
                    opacity: updatingAvatar ? 0.65 : 1,
                  },
                ]}
              >
                <Feather
                  name={updatingAvatar ? "loader" : "camera"}
                  size={13}
                  color={colors.primaryForeground}
                />
              </View>
            </TouchableOpacity>
            <View style={styles.identityText}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {displayName}
              </Text>
              <Text
                style={[styles.identityMeta, { color: colors.mutedForeground }]}
              >
                {currentUser?.role === "admin"
                  ? "Admin record"
                  : "Member record"}
              </Text>
            </View>
          </View>

          <View style={styles.avatarTools}>
            <TouchableOpacity
              onPress={pickProfileImage}
              disabled={updatingAvatar}
              style={[
                styles.avatarUploadBtn,
                {
                  borderColor: colors.border,
                  opacity: updatingAvatar ? 0.55 : 1,
                },
              ]}
              activeOpacity={0.78}
            >
              <Feather name="image" size={14} color={colors.foreground} />
              <Text
                style={[styles.avatarUploadText, { color: colors.foreground }]}
              >
                {updatingAvatar ? "Saving…" : "Upload picture"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statGrid}>
            <ProfileStat
              label="Pacts"
              value={String(commitments.length)}
              colors={colors}
            />
            <ProfileStat
              label="Refund credit"
              value={formatCurrency(refundCredit)}
              colors={colors}
            />
            <ProfileStat
              label="Still at risk"
              value={formatCurrency(totalAtRisk)}
              colors={colors}
            />
          </View>
        </View>

        <Section title="Account" colors={colors}>
          <InfoRow icon="mail" label="Email" value={email} colors={colors} />
          <Divider colors={colors} />
          {editingWhatsApp ? (
            <WhatsAppEditRow
              value={whatsAppInput}
              onChange={setWhatsAppInput}
              onCancel={() => setEditingWhatsApp(false)}
              onSave={saveWhatsAppNumber}
              saving={savingWhatsApp}
              colors={colors}
            />
          ) : (
            <ActionRow
              icon="message-circle"
              label="WhatsApp"
              value={whatsAppDisplay}
              onPress={startWhatsAppEdit}
              colors={colors}
            />
          )}
          <Divider colors={colors} />
          <InfoRow
            icon="calendar"
            label="Joined"
            value={joined}
            colors={colors}
          />
        </Section>

        <Section title="Settings" colors={colors}>
          <ActionRow
            icon="repeat"
            label="Transactions"
            value="Refunds, forfeits, payouts"
            onPress={() => router.push("/profile/transactions")}
            colors={colors}
          />
          <Divider colors={colors} />
          <ActionRow
            icon="file-text"
            label="Terms"
            value="pactraven.com"
            onPress={() => void Linking.openURL(LEGAL_URLS.terms)}
            colors={colors}
          />
          <Divider colors={colors} />
          <ActionRow
            icon="lock"
            label="Privacy"
            value="Data and proof record"
            onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}
            colors={colors}
          />
          <Divider colors={colors} />
          <ActionRow
            icon="credit-card"
            label="Payments and refunds"
            value="Policy record"
            onPress={() => void Linking.openURL(LEGAL_URLS.payments)}
            colors={colors}
          />
        </Section>

        <TouchableOpacity
          onPress={() => void signOut()}
          style={[
            styles.signOutBtn,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
          activeOpacity={0.78}
        >
          <Feather name="log-out" size={16} color={colors.mutedForeground} />
          <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>
            Sign out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function formatProfileDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function ProfileStat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={[styles.statItem, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Feather name={icon as any} size={15} color={colors.mutedForeground} />
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
      <Text
        style={[styles.rowValue, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  value,
  onPress,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.78}>
      <View style={styles.rowLeft}>
        <Feather name={icon as any} size={15} color={colors.mutedForeground} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>
          {label}
        </Text>
      </View>
      <View style={styles.actionRight}>
        <Text
          style={[styles.actionValue, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Feather
          name="chevron-right"
          size={17}
          color={colors.mutedForeground}
        />
      </View>
    </TouchableOpacity>
  );
}

function WhatsAppEditRow({
  value,
  onChange,
  onCancel,
  onSave,
  saving,
  colors,
}: {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  colors: any;
}) {
  return (
    <View style={styles.editBlock}>
      <View style={styles.editHeader}>
        <View style={styles.rowLeft}>
          <Feather
            name="message-circle"
            size={15}
            color={colors.mutedForeground}
          />
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>
            WhatsApp
          </Text>
        </View>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        placeholder="+91 98765 43210"
        placeholderTextColor={colors.mutedForeground}
        editable={!saving}
        style={[
          styles.whatsAppInput,
          {
            color: colors.foreground,
            backgroundColor: colors.input,
            borderColor: colors.border,
          },
        ]}
      />
      <Text style={[styles.editHint, { color: colors.mutedForeground }]}>
        India numbers can be entered as 10 digits.
      </Text>
      <View style={styles.editActions}>
        <TouchableOpacity
          onPress={onCancel}
          disabled={saving}
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          activeOpacity={0.78}
        >
          <Text
            style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}
          >
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: saving ? 0.55 : 1 },
          ]}
          activeOpacity={0.84}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving…" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  identityCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  identityTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  avatarButton: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  avatarEditBadge: {
    position: "absolute",
    right: -5,
    bottom: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: { flex: 1 },
  name: { fontSize: 19, fontFamily: "Inter_700Bold" },
  identityMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  avatarTools: {
    flexDirection: "row",
    marginBottom: 10,
  },
  avatarUploadBtn: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarUploadText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  statGrid: {
    flexDirection: "row",
    gap: 8,
  },
  statItem: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 66,
    justifyContent: "center",
  },
  statValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  sectionCard: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
    minWidth: 0,
  },
  rowLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  actionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "52%",
  },
  actionValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  editBlock: {
    paddingVertical: 12,
    gap: 9,
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  whatsAppInput: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  editHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  secondaryBtn: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  saveBtn: {
    minHeight: 38,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  divider: { height: 1 },
  signOutBtn: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
