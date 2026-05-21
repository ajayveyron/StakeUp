import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Image,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";

import { Commitment } from "@/contexts/CommitmentsContext";
import { selectWorkoutProofPrompt } from "@/constants/workoutProofPrompts";
import { useColors } from "@/hooks/useColors";
import {
  formatCountdown,
  formatCurrency,
  getMsUntilDeadline,
  getRefundPerDay,
} from "@/utils/commitment";

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
    submissionStatement?: string
  ) => void;
  onSubmitWorkout: (
    commitmentId: string,
    date: string,
    proofUrl: string,
    proofPrompt?: string,
    submissionSignature?: string,
    submissionStatement?: string
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
  const [url, setUrl] = useState("");
  const [workoutProofUrl, setWorkoutProofUrl] = useState("");
  const [referenceImageFailed, setReferenceImageFailed] = useState(false);
  const [signatureStrokes, setSignatureStrokes] = useState<SignatureStroke[]>(
    []
  );
  const proofPrompt = useMemo(
    () => selectWorkoutProofPrompt(commitment?.id, date),
    [commitment?.id, date]
  );
  const [countdown, setCountdown] = useState(getMsUntilDeadline());
  const urlRef = useRef<TextInput>(null);
  const workoutRef = useRef<TextInput>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getMsUntilDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (visible) {
      setUrl("");
      setWorkoutProofUrl("");
      setReferenceImageFailed(false);
      setSignatureStrokes([]);
      setTimeout(() => {
        if (commitment?.goalType === "content") urlRef.current?.focus();
        else workoutRef.current?.focus();
      }, 300);
    }
  }, [visible, commitment?.goalType]);

  if (!commitment) return null;

  const refundPerDay = getRefundPerDay(commitment);
  const isContent = commitment.goalType === "content";
  const proofReady = isContent
    ? url.trim().startsWith("http")
    : workoutProofUrl.trim().startsWith("http");
  const hasSignature = signatureStrokes.some((stroke) => stroke.length > 1);
  const canSubmit = proofReady && hasSignature;
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
              return [[{ x: Math.max(0, locationX), y: Math.max(0, locationY) }]];
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
    [proofReady]
  );

  function signaturePayload() {
    return JSON.stringify({
      statement: SUBMISSION_STATEMENT,
      strokes: signatureStrokes,
      signedAt: new Date().toISOString(),
    });
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
        SUBMISSION_STATEMENT
      );
    } else {
      onSubmitWorkout(
        commitment!.id,
        date,
        workoutProofUrl.trim(),
        proofPrompt.text,
        signaturePayload(),
        SUBMISSION_STATEMENT
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
              <Text style={[styles.commitName, { color: colors.mutedForeground }]} numberOfLines={1}>
                {commitment.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

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
                  countdown < 3600000
                    ? colors.danger + "44"
                    : colors.border,
              },
            ]}
          >
            <Feather
              name="clock"
              size={12}
              color={countdown < 3600000 ? colors.danger : colors.mutedForeground}
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
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Public proof link
              </Text>
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                Post it publicly. Paste the link. Sign the record.
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Feather name="link" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
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
                  <TouchableOpacity onPress={() => setUrl("")} activeOpacity={0.7}>
                    <Feather name="x-circle" size={16} color={colors.mutedForeground} />
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
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Workout proof
              </Text>
              <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                Match the prompt. No old photos. No vague proof: {proofPrompt.text}
              </Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.input, borderColor: colors.border },
                ]}
              >
                <Feather name="camera" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  ref={workoutRef}
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Paste camera proof link"
                  placeholderTextColor={colors.mutedForeground}
                  value={workoutProofUrl}
                  onChangeText={setWorkoutProofUrl}
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {workoutProofUrl.trim().length > 0 &&
                !workoutProofUrl.trim().startsWith("http") && (
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    Must be a valid proof link starting with http
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
                <Feather name="camera" size={14} color={colors.primary} />
                <Text
                  style={[
                    styles.proofPromptText,
                    { color: colors.primary },
                  ]}
                >
                  Fresh proof must clearly show: {proofPrompt.text}
                </Text>
              </View>

              <View
                style={[
                  styles.referenceImageBox,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
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
                      Add {proofPrompt.referenceImage.assetKey}.png to show a
                      reference image.
                    </Text>
                  </View>
                )}
              </View>

              {/* Camera capture placeholder */}
              <View
                style={[
                  styles.healthBox,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Feather name="smartphone" size={14} color={colors.mutedForeground} />
                <Text style={[styles.healthText, { color: colors.mutedForeground }]}>
                  PWA camera upload will attach directly here once storage is wired. For now, paste the proof link and sign the submission.
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
                    borderColor: hasSignature ? colors.primary : colors.border,
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
                  <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
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
              { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" },
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
                backgroundColor: canSubmit ? colors.primary : colors.secondary,
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
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    gap: 14,
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
