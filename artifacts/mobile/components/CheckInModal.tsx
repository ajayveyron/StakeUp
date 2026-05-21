import { Feather } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Image,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";

import { Commitment, ProofLocation } from "@/contexts/CommitmentsContext";
import { selectWorkoutProofPrompt } from "@/constants/workoutProofPrompts";
import { useColors } from "@/hooks/useColors";
import {
  formatCountdown,
  formatCurrency,
  getMsUntilDeadline,
  getRefundPerDay,
} from "@/utils/commitment";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface Props {
  visible: boolean;
  commitment: Commitment | null;
  date: string;
  onClose: () => void;
  onSubmitContent: (
    commitmentId: string,
    date: string,
    url: string,
    submissionSignature?: string,
    submissionStatement?: string,
  ) => void;
  onSubmitWorkout: (
    commitmentId: string,
    date: string,
    proofStorageId: string,
    proofPrompt: string,
    proofLocation: ProofLocation,
    submissionSignature?: string,
    submissionStatement?: string,
  ) => void;
}

type SignaturePoint = { x: number; y: number };
type SignatureStroke = SignaturePoint[];

const SUBMISSION_STATEMENT = "I did today's submission";

export function CheckInModal({
  visible,
  commitment,
  date,
  onClose,
  onSubmitContent,
  onSubmitWorkout,
}: Props) {
  const colors = useColors();
  const generateProofUploadUrl = useMutation(
    api.checkIns.generateProofUploadUrl,
  );
  const [url, setUrl] = useState("");
  const [workoutProofStorageId, setWorkoutProofStorageId] = useState<
    string | undefined
  >();
  const [workoutProofLocation, setWorkoutProofLocation] = useState<
    ProofLocation | undefined
  >();
  const [workoutPreviewUri, setWorkoutPreviewUri] = useState<
    string | undefined
  >();
  const [uploadingWorkoutProof, setUploadingWorkoutProof] = useState(false);
  const [workoutUploadError, setWorkoutUploadError] = useState<
    string | undefined
  >();
  const [referenceImageFailed, setReferenceImageFailed] = useState(false);
  const [signatureStrokes, setSignatureStrokes] = useState<SignatureStroke[]>(
    [],
  );
  const proofPrompt = useMemo(
    () => selectWorkoutProofPrompt(commitment?.id, date),
    [commitment?.id, date],
  );
  const [countdown, setCountdown] = useState(getMsUntilDeadline());
  const urlRef = useRef<TextInput>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getMsUntilDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (visible) {
      setUrl("");
      setWorkoutProofStorageId(undefined);
      setWorkoutProofLocation(undefined);
      setWorkoutPreviewUri(undefined);
      setWorkoutUploadError(undefined);
      setReferenceImageFailed(false);
      setSignatureStrokes([]);
      setTimeout(() => {
        if (commitment?.goalType === "content") urlRef.current?.focus();
      }, 300);
    }
  }, [visible, commitment?.goalType]);

  if (!commitment) return null;

  const refundPerDay = getRefundPerDay(commitment);
  const isContent = commitment.goalType === "content";
  const proofReady = isContent
    ? url.trim().startsWith("http")
    : Boolean(workoutProofStorageId && workoutProofLocation);
  const hasSignature = signatureStrokes.some((stroke) => stroke.length > 1);
  const canSubmit = proofReady && hasSignature && !uploadingWorkoutProof;
  const signaturePadResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => proofReady,
        onMoveShouldSetPanResponder: () => proofReady,
        onPanResponderGrant: (event) => {
          if (!proofReady) return;
          const { locationX, locationY } = event.nativeEvent;
          setSignatureStrokes((prev) => [
            ...prev,
            [{ x: Math.max(0, locationX), y: Math.max(0, locationY) }],
          ]);
        },
        onPanResponderMove: (event) => {
          if (!proofReady) return;
          const { locationX, locationY } = event.nativeEvent;
          setSignatureStrokes((prev) => {
            if (prev.length === 0) {
              return [
                [{ x: Math.max(0, locationX), y: Math.max(0, locationY) }],
              ];
            }
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = [
              ...last,
              { x: Math.max(0, locationX), y: Math.max(0, locationY) },
            ];
            return next;
          });
        },
      }),
    [proofReady],
  );

  function signaturePayload() {
    return JSON.stringify({
      statement: SUBMISSION_STATEMENT,
      strokes: signatureStrokes,
      signedAt: new Date().toISOString(),
    });
  }

  async function uploadWorkoutAsset(asset: ImagePicker.ImagePickerAsset) {
    if (!commitment) return;
    const body = asset.file ?? (await (await fetch(asset.uri)).blob());
    const contentType =
      asset.mimeType ||
      (body instanceof Blob ? body.type : undefined) ||
      "image/jpeg";
    const uploadUrl = await generateProofUploadUrl({
      commitmentId: commitment.id as Id<"commitments">,
    });
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
    });
    if (!response.ok) {
      throw new Error("Proof upload failed");
    }
    const result = (await response.json()) as { storageId?: string };
    if (!result.storageId)
      throw new Error("Proof upload did not return a file id");
    setWorkoutProofStorageId(result.storageId);
    setWorkoutPreviewUri(asset.uri);
  }

  async function ensureWorkoutProofPermissions() {
    if (Platform.OS !== "web") {
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        throw new Error("Camera permission is required for workout proof");
      }
    }

    const locationPermission =
      await Location.requestForegroundPermissionsAsync();
    if (!locationPermission.granted) {
      throw new Error("Location permission is required for workout proof");
    }
  }

  async function readWorkoutProofLocation(): Promise<ProofLocation> {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? undefined,
      capturedAt: new Date().toISOString(),
    };
  }

  function formatLocation(location: ProofLocation) {
    const accuracy =
      typeof location.accuracy === "number"
        ? ` · ±${Math.round(location.accuracy)}m`
        : "";
    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(
      5,
    )}${accuracy}`;
  }

  async function takeWorkoutProof() {
    if (!commitment || uploadingWorkoutProof) return;
    setUploadingWorkoutProof(true);
    setWorkoutUploadError(undefined);
    try {
      await ensureWorkoutProofPermissions();
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const proofLocation = await readWorkoutProofLocation();
      await uploadWorkoutAsset(result.assets[0]);
      setWorkoutProofLocation(proofLocation);
    } catch (error) {
      setWorkoutUploadError(
        error instanceof Error ? error.message : "Could not attach proof",
      );
    } finally {
      setUploadingWorkoutProof(false);
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isContent) {
      onSubmitContent(
        commitment!.id,
        date,
        url.trim(),
        signaturePayload(),
        SUBMISSION_STATEMENT,
      );
    } else {
      onSubmitWorkout(
        commitment!.id,
        date,
        workoutProofStorageId!,
        proofPrompt.text,
        workoutProofLocation!,
        signaturePayload(),
        SUBMISSION_STATEMENT,
      );
    }
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {isContent ? "Show Proof" : "Show Workout Proof"}
              </Text>
              <Text
                style={[styles.commitName, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {commitment.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Deadline countdown */}
            <View
              style={[
                styles.deadlineBadge,
                {
                  backgroundColor:
                    countdown < 3600000
                      ? colors.danger + "22"
                      : colors.secondary,
                  borderColor:
                    countdown < 3600000 ? colors.danger + "44" : colors.border,
                },
              ]}
            >
              <Feather
                name="clock"
                size={12}
                color={
                  countdown < 3600000 ? colors.danger : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.deadlineText,
                  {
                    color:
                      countdown < 3600000
                        ? colors.danger
                        : colors.mutedForeground,
                  },
                ]}
              >
                {formatCountdown(countdown)} · Deadline 11:59 PM
              </Text>
            </View>

            {/* Content: URL input */}
            {isContent && (
              <View style={styles.section}>
                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground }]}
                >
                  Public proof link
                </Text>
                <Text
                  style={[styles.fieldHint, { color: colors.mutedForeground }]}
                >
                  Post it publicly. Paste the link. Sign the record.
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather
                    name="link"
                    size={16}
                    color={colors.mutedForeground}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={urlRef}
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="https://..."
                    placeholderTextColor={colors.mutedForeground}
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  {url.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setUrl("")}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="x-circle"
                        size={16}
                        color={colors.mutedForeground}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {url.trim().length > 0 && !url.trim().startsWith("http") && (
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    Must be a valid URL starting with http
                  </Text>
                )}
              </View>
            )}

            {/* Workout proof input */}
            {!isContent && (
              <View style={styles.section}>
                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground }]}
                >
                  Workout proof
                </Text>
                <Text
                  style={[styles.fieldHint, { color: colors.mutedForeground }]}
                >
                  Use the camera now. Location is captured with the proof.
                  Match the daily pose: {proofPrompt.text}
                </Text>

                <View style={styles.uploadActions}>
                  <TouchableOpacity
                    onPress={() => void takeWorkoutProof()}
                    disabled={uploadingWorkoutProof}
                    activeOpacity={0.8}
                    style={[
                      styles.uploadBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: uploadingWorkoutProof ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Feather name="camera" size={14} color="#000" />
                    <Text style={styles.uploadBtnText}>
                      {uploadingWorkoutProof
                        ? "Capturing..."
                        : workoutProofStorageId
                          ? "Retake camera proof"
                          : "Take camera proof"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {workoutPreviewUri && (
                  <View
                    style={[
                      styles.proofPreview,
                      {
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: workoutPreviewUri }}
                      accessibilityLabel="Attached workout proof"
                      style={styles.proofPreviewImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setWorkoutPreviewUri(undefined);
                        setWorkoutProofStorageId(undefined);
                        setWorkoutProofLocation(undefined);
                      }}
                      activeOpacity={0.75}
                      style={[
                        styles.removeProofBtn,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <Feather name="x" size={14} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                )}

                {workoutProofLocation && (
                  <View
                    style={[
                      styles.locationBox,
                      {
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Feather
                      name="map-pin"
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.locationText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Location captured · {formatLocation(workoutProofLocation)}
                    </Text>
                  </View>
                )}

                {workoutUploadError && (
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {workoutUploadError}
                  </Text>
                )}

                <View
                  style={[
                    styles.proofPromptBox,
                    {
                      backgroundColor: colors.primary + "14",
                      borderColor: colors.primary + "33",
                    },
                  ]}
                >
                  <Feather name="activity" size={14} color={colors.primary} />
                  <Text
                    style={[styles.proofPromptText, { color: colors.primary }]}
                  >
                    Fresh proof must clearly show: {proofPrompt.text}
                  </Text>
                </View>

                <View
                  style={[
                    styles.referenceImageBox,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {!referenceImageFailed ? (
                    <Image
                      source={{ uri: proofPrompt.referenceImage.uri }}
                      accessibilityLabel={proofPrompt.referenceImage.alt}
                      onError={() => setReferenceImageFailed(true)}
                      style={styles.referenceImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.referenceFallback}>
                      <Feather
                        name="image"
                        size={18}
                        color={colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.referenceFallbackText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Reference image unavailable. Follow the pose prompt
                        above.
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.healthBox,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather
                    name="shield"
                    size={14}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.healthText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Workout proof accepts only a fresh camera capture, device
                    location, and the daily pose prompt. Gallery uploads and
                    proof links are not accepted.
                  </Text>
                </View>
              </View>
            )}

            {proofReady && (
              <View style={styles.section}>
                <View style={styles.signatureHeader}>
                  <View style={styles.signatureTitleWrap}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Sign the record
                    </Text>
                    <Text
                      style={[
                        styles.signatureStatement,
                        { color: colors.foreground },
                      ]}
                    >
                      {SUBMISSION_STATEMENT}
                    </Text>
                  </View>
                  {signatureStrokes.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSignatureStrokes([])}
                      activeOpacity={0.75}
                      style={[
                        styles.clearSignatureBtn,
                        { backgroundColor: colors.secondary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.clearSignatureText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Clear
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View
                  {...signaturePadResponder.panHandlers}
                  style={[
                    styles.signaturePad,
                    {
                      backgroundColor: colors.input,
                      borderColor: hasSignature
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  {signatureStrokes.length === 0 ? (
                    <Text
                      style={[
                        styles.signaturePlaceholder,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Sign here with your finger
                    </Text>
                  ) : (
                    <Svg
                      width="100%"
                      height="100%"
                      style={StyleSheet.absoluteFill}
                    >
                      {signatureStrokes.map((stroke, index) => (
                        <Polyline
                          key={`${stroke.length}:${index}`}
                          points={stroke
                            .map((point) => `${point.x},${point.y}`)
                            .join(" ")}
                          fill="none"
                          stroke={colors.primary}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                        />
                      ))}
                    </Svg>
                  )}
                </View>
              </View>
            )}

            {/* Refund preview */}
            <View
              style={[
                styles.refundPreview,
                {
                  backgroundColor: colors.primary + "14",
                  borderColor: colors.primary + "33",
                },
              ]}
            >
              <Feather name="rotate-ccw" size={14} color={colors.primary} />
              <Text style={[styles.refundText, { color: colors.primary }]}>
                {proofReady && !hasSignature
                  ? `Sign "${SUBMISSION_STATEMENT}" to lock this into the record`
                  : isContent && canSubmit
                    ? `If successful, ${formatCurrency(refundPerDay, commitment.currency)} comes back as refund credit`
                    : !isContent && canSubmit
                      ? `If successful, ${formatCurrency(refundPerDay, commitment.currency)} comes back as refund credit`
                      : `Show proof by the deadline. The Raven records the proof.`}
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: canSubmit
                    ? colors.primary
                    : colors.secondary,
                  opacity: canSubmit ? 1 : 0.5,
                },
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.submitText,
                  { color: canSubmit ? "#000" : colors.mutedForeground },
                ]}
              >
                Sign and Submit
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    gap: 14,
  },
  sheetContent: {
    gap: 14,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  commitName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  deadlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  section: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: -4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  uploadActions: {
    flexDirection: "row",
    gap: 10,
  },
  uploadBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  uploadBtnText: {
    color: "#000",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  uploadSecondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  uploadSecondaryText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  proofPreview: {
    height: 140,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    position: "relative",
  },
  proofPreviewImage: {
    width: "100%",
    height: "100%",
  },
  removeProofBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  locationText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
  },
  proofPromptBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  proofPromptText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  referenceImageBox: {
    height: 112,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
  },
  referenceImage: {
    width: "100%",
    height: "100%",
  },
  referenceFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  referenceFallbackText: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
  },
  signatureHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  signatureTitleWrap: {
    flex: 1,
    gap: 3,
  },
  signatureStatement: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  clearSignatureBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearSignatureText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  signaturePad: {
    height: 96,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  signaturePlaceholder: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  healthBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  healthText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 16,
  },
  refundPreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  refundText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 18,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
