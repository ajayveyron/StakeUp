import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type GoalType =
  | "content"
  | "steps"
  | "exercise"
  | "reading"
  | "custom";

export interface CheckIn {
  id: string;
  date: string;
  note?: string;
}

export interface Commitment {
  id: string;
  name: string;
  goalType: GoalType;
  goalUnit: string;
  targetCount: number;
  stakeAmount: number;
  currency: string;
  startDate: string;
  endDate: string;
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
  checkIn: (commitmentId: string, date: string, note?: string) => void;
  removeCheckIn: (commitmentId: string, date: string) => void;
  getCommitment: (id: string) => Commitment | undefined;
}

const STORAGE_KEY = "@stakeup_commitments_v1";

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

  const checkIn = useCallback(
    (commitmentId: string, date: string, note?: string) => {
      save(
        commitments.map((c) => {
          if (c.id !== commitmentId) return c;
          if (c.checkIns.some((ci) => ci.date === date)) return c;
          return {
            ...c,
            checkIns: [
              ...c.checkIns,
              { id: genId(), date, note },
            ],
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
        checkIn,
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
