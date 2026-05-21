import { useMutation, useQuery } from "convex/react";
import React, { createContext, useCallback, useContext } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { CharityDestination } from "@/constants/charities";

export type GoalType = "content" | "workout";
export type CheckInStatus = "under_review" | "approved" | "rejected" | "missed";
export type ForfeitDestination = CharityDestination;
export type CommitmentStatus =
  | "draft"
  | "pending_payment"
  | "pending_deposit"
  | "active"
  | "ended"
  | "deleted";

export interface ProofLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
}

export interface CheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  proofUrl?: string; // content: public post URL
  proofStorageId?: string; // workout: direct upload stored in Convex
  proofPrompt?: string; // workout: daily physical proof prompt
  proofLocation?: ProofLocation; // workout: captured device location
  submissionSignature?: string; // fun/accountability signature stroke payload
  submissionStatement?: string;
  stepCount?: number; // legacy step count data
  status?: CheckInStatus; // missing means legacy data; use verified as fallback
  verified?: boolean; // true = approved and qualifies for refund
  rejectionReason?: string;
  reviewedAt?: string;
  submittedAt: string; // ISO timestamp
}

export interface Commitment {
  id: string;
  name: string;
  goalType: GoalType;
  daysOfWeek: number[]; // 0=Sun 1=Mon ... 6=Sat
  targetPerDay: number; // workout/content submissions per scheduled day
  durationDays: number; // 7, 14, 30, 90
  pactAmount: number;
  platformFeeAmount?: number;
  currency: string;
  forfeitDestination?: ForfeitDestination;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  timezone?: string;
  status?: CommitmentStatus;
  slotConsumedAt?: string;
  paymentConfirmedAt?: string;
  paymentReference?: string;
  paymentNote?: string;
  endedAt?: string;
  earlyEndReason?: string;
  earlyEndSettlementStatus?: "pending" | "resolved" | "cancelled";
  checkIns: CheckIn[];
  createdAt: string;
  updatedAt?: string;
}

interface CommitmentsContextType {
  commitments: Commitment[];
  addCommitment: (
    c: Omit<Commitment, "id" | "checkIns" | "createdAt">,
  ) => Promise<string | null>;
  deleteCommitment: (id: string) => void;
  submitContentCheckIn: (
    commitmentId: string,
    date: string,
    proofUrl: string,
    submissionSignature?: string,
    submissionStatement?: string,
  ) => void;
  submitWorkoutCheckIn: (
    commitmentId: string,
    date: string,
    proofStorageId: string,
    proofPrompt: string,
    proofLocation: ProofLocation,
    submissionSignature?: string,
    submissionStatement?: string,
  ) => void;
  approveCheckIn: (commitmentId: string, date: string) => void;
  rejectCheckIn: (
    commitmentId: string,
    date: string,
    rejectionReason: string,
  ) => void;
  removeCheckIn: (commitmentId: string, date: string) => void;
  getCommitment: (id: string) => Commitment | undefined;
}

const CommitmentsContext = createContext<CommitmentsContextType | null>(null);

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function logMutationError(error: unknown) {
  console.error(error);
}

export function CommitmentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const commitments = (useQuery(api.commitments.listMine) ??
    []) as Commitment[];
  const createCommitment = useMutation(api.commitments.create);
  const deleteMine = useMutation(api.commitments.deleteMine);
  const submitContent = useMutation(api.checkIns.submitContent);
  const submitWorkout = useMutation(api.checkIns.submitWorkout);
  const approve = useMutation(api.reviews.approve);
  const reject = useMutation(api.reviews.reject);
  const removeMine = useMutation(api.checkIns.removeMine);

  const addCommitment = useCallback(
    async (c: Omit<Commitment, "id" | "checkIns" | "createdAt">) => {
      try {
        return await createCommitment({
          name: c.name,
          goalType: c.goalType,
          daysOfWeek: c.daysOfWeek,
          targetPerDay: c.targetPerDay,
          durationDays: c.durationDays,
          pactAmount: c.pactAmount,
          currency: c.currency,
          forfeitDestination: c.forfeitDestination ?? "akshaya_patra",
          startDate: c.startDate,
          endDate: c.endDate,
          timezone: c.timezone ?? deviceTimeZone(),
        });
      } catch (error) {
        logMutationError(error);
        return null;
      }
    },
    [createCommitment],
  );

  const deleteCommitment = useCallback(
    (id: string) => {
      void deleteMine({ id: id as Id<"commitments"> }).catch(logMutationError);
    },
    [deleteMine],
  );

  const submitContentCheckIn = useCallback(
    (
      commitmentId: string,
      date: string,
      proofUrl: string,
      submissionSignature?: string,
      submissionStatement?: string,
    ) => {
      void submitContent({
        commitmentId: commitmentId as Id<"commitments">,
        date,
        proofUrl,
        submissionSignature,
        submissionStatement,
      }).catch(logMutationError);
    },
    [submitContent],
  );

  const submitWorkoutCheckIn = useCallback(
    (
      commitmentId: string,
      date: string,
      proofStorageId: string,
      proofPrompt: string,
      proofLocation: ProofLocation,
      submissionSignature?: string,
      submissionStatement?: string,
    ) => {
      void submitWorkout({
        commitmentId: commitmentId as Id<"commitments">,
        date,
        proofStorageId: proofStorageId as Id<"_storage">,
        proofPrompt,
        proofLocation,
        submissionSignature,
        submissionStatement,
      }).catch(logMutationError);
    },
    [submitWorkout],
  );

  const approveCheckIn = useCallback(
    (commitmentId: string, date: string) => {
      const checkIn = commitments
        .find((c) => c.id === commitmentId)
        ?.checkIns.find((ci) => ci.date === date);
      if (!checkIn) return;
      void approve({ checkInId: checkIn.id as Id<"checkIns"> }).catch(
        logMutationError,
      );
    },
    [approve, commitments],
  );

  const rejectCheckIn = useCallback(
    (commitmentId: string, date: string, rejectionReason: string) => {
      const checkIn = commitments
        .find((c) => c.id === commitmentId)
        ?.checkIns.find((ci) => ci.date === date);
      if (!checkIn) return;
      void reject({
        checkInId: checkIn.id as Id<"checkIns">,
        reason: rejectionReason,
      }).catch(logMutationError);
    },
    [commitments, reject],
  );

  const removeCheckIn = useCallback(
    (commitmentId: string, date: string) => {
      void removeMine({
        commitmentId: commitmentId as Id<"commitments">,
        date,
      }).catch(logMutationError);
    },
    [removeMine],
  );

  const getCommitment = useCallback(
    (id: string) => commitments.find((c) => c.id === id),
    [commitments],
  );

  return (
    <CommitmentsContext.Provider
      value={{
        commitments,
        addCommitment,
        deleteCommitment,
        submitContentCheckIn,
        submitWorkoutCheckIn,
        approveCheckIn,
        rejectCheckIn,
        removeCheckIn,
        getCommitment,
      }}
    >
      {children}
    </CommitmentsContext.Provider>
  );
}

export function useCommitments() {
  const ctx = useContext(CommitmentsContext);
  if (!ctx)
    throw new Error("useCommitments must be used inside CommitmentsProvider");
  return ctx;
}
