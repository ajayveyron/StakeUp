import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type GoalType = "content" | "steps";

export interface CheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  proofUrl?: string; // content: public post URL
  stepCount?: number; // steps: step count logged
  verified: boolean; // true = qualifies for refund
  submittedAt: string; // ISO timestamp
}

export interface Commitment {
  id: string;
  name: string;
  goalType: GoalType;
  daysOfWeek: number[]; // 0=Sun 1=Mon ... 6=Sat
  targetPerDay: number; // steps: step goal; content: posts per day
  durationDays: number; // 7, 14, 30, 90
  stakeAmount: number;
  currency: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  friendName?: string;
  friendContact?: string;
  checkIns: CheckIn[];
  createdAt: string;
}

interface CommitmentsContextType {
  commitments: Commitment[];
  addCommitment: (
    c: Omit<Commitment, "id" | "checkIns" | "createdAt">
  ) => void;
  deleteCommitment: (id: string) => void;
  submitContentCheckIn: (
    commitmentId: string,
    date: string,
    proofUrl: string
  ) => void;
  submitStepsCheckIn: (
    commitmentId: string,
    date: string,
    stepCount: number
  ) => void;
  removeCheckIn: (commitmentId: string, date: string) => void;
  getCommitment: (id: string) => Commitment | undefined;
}

const STORAGE_KEY = "@stakeup_v2_commitments";

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const CommitmentsContext = createContext<CommitmentsContextType | null>(null);

export function CommitmentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setCommitments(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const save = useCallback((updated: Commitment[]) => {
    setCommitments(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addCommitment = useCallback(
    (c: Omit<Commitment, "id" | "checkIns" | "createdAt">) => {
      const newC: Commitment = {
        ...c,
        id: genId(),
        checkIns: [],
        createdAt: new Date().toISOString(),
      };
      save([...commitments, newC]);
    },
    [commitments, save]
  );

  const deleteCommitment = useCallback(
    (id: string) => {
      save(commitments.filter((c) => c.id !== id));
    },
    [commitments, save]
  );

  const submitContentCheckIn = useCallback(
    (commitmentId: string, date: string, proofUrl: string) => {
      save(
        commitments.map((c) => {
          if (c.id !== commitmentId) return c;
          const existing = c.checkIns.find((ci) => ci.date === date);
          const entry: CheckIn = {
            id: existing?.id ?? genId(),
            date,
            proofUrl,
            verified: proofUrl.trim().startsWith("http"),
            submittedAt: new Date().toISOString(),
          };
          return {
            ...c,
            checkIns: existing
              ? c.checkIns.map((ci) => (ci.date === date ? entry : ci))
              : [...c.checkIns, entry],
          };
        })
      );
    },
    [commitments, save]
  );

  const submitStepsCheckIn = useCallback(
    (commitmentId: string, date: string, stepCount: number) => {
      save(
        commitments.map((c) => {
          if (c.id !== commitmentId) return c;
          const existing = c.checkIns.find((ci) => ci.date === date);
          const entry: CheckIn = {
            id: existing?.id ?? genId(),
            date,
            stepCount,
            verified: stepCount >= c.targetPerDay,
            submittedAt: new Date().toISOString(),
          };
          return {
            ...c,
            checkIns: existing
              ? c.checkIns.map((ci) => (ci.date === date ? entry : ci))
              : [...c.checkIns, entry],
          };
        })
      );
    },
    [commitments, save]
  );

  const removeCheckIn = useCallback(
    (commitmentId: string, date: string) => {
      save(
        commitments.map((c) => {
          if (c.id !== commitmentId) return c;
          return {
            ...c,
            checkIns: c.checkIns.filter((ci) => ci.date !== date),
          };
        })
      );
    },
    [commitments, save]
  );

  const getCommitment = useCallback(
    (id: string) => commitments.find((c) => c.id === id),
    [commitments]
  );

  return (
    <CommitmentsContext.Provider
      value={{
        commitments,
        addCommitment,
        deleteCommitment,
        submitContentCheckIn,
        submitStepsCheckIn,
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
