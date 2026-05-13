import { CheckIn, Commitment, GoalType } from "@/contexts/CommitmentsContext";

// ── Local date helpers ─────────────────────────────────────────────────────
// IMPORTANT: never use toISOString() for date strings — it converts to UTC
// and will return the wrong calendar day for UTC+ users (e.g. India IST).
function localDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getTodayStr(): string {
  return localDateStr(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  return (
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

// ── Formatting helpers ────────────────────────────────────────────────────
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatCurrency(amount: number, currency = "INR"): string {
  const rounded = Math.round(amount * 100) / 100;
  if (currency === "INR") return `₹${rounded.toLocaleString("en-IN")}`;
  return `$${rounded.toLocaleString("en-US")}`;
}

export function goalTypeLabel(type: GoalType): string {
  return type === "content" ? "Content Creation" : "Step Count";
}

export function goalTypeUnit(type: GoalType): string {
  return type === "content" ? "post" : "steps";
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export function formatDaysOfWeek(days: number[]): string {
  if (days.length === 7) return "Every day";
  if (days.length === 0) return "No days";
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.map((d) => DAY_NAMES[d]).join(", ");
}

export function getDayName(day: number): string {
  return DAY_NAMES[day];
}

export function getDayNameFull(day: number): string {
  return DAY_NAMES_FULL[day];
}

// ── Duration types ────────────────────────────────────────────────────────
export type DurationType = "week" | "2weeks" | "month" | "3months";

export function getEndDateForDuration(
  startDate: string,
  durationType: DurationType
): string {
  const start = new Date(startDate + "T00:00:00");
  switch (durationType) {
    case "week":
      return addDays(startDate, 6); // 7 days inclusive
    case "2weeks":
      return addDays(startDate, 13); // 14 days inclusive
    case "month": {
      // Same day next month, minus 1 day: Jun 1 → Jun 30; Feb 1 → Feb 28/29
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      return localDateStr(end);
    }
    case "3months": {
      const end = new Date(start);
      end.setMonth(end.getMonth() + 3);
      end.setDate(end.getDate() - 1);
      return localDateStr(end);
    }
  }
}

export function getDurationLabel(durationType: DurationType): string {
  switch (durationType) {
    case "week":    return "1 Week";
    case "2weeks":  return "2 Weeks";
    case "month":   return "1 Month";
    case "3months": return "3 Months";
  }
}

// ── Start date picker ─────────────────────────────────────────────────────
export function getStartDateOptions(count = 30): string[] {
  const today = getTodayStr();
  const options: string[] = [];
  for (let i = 0; i < count; i++) options.push(addDays(today, i));
  return options;
}

export function formatStartDateOption(dateStr: string): {
  line1: string;
  line2: string;
} {
  const today = getTodayStr();
  const tomorrow = addDays(today, 1);
  const d = new Date(dateStr + "T00:00:00");
  if (dateStr === today)
    return {
      line1: "Today",
      line2: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    };
  if (dateStr === tomorrow)
    return {
      line1: "Tmrw",
      line2: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    };
  return {
    line1: d.toLocaleDateString("en-IN", { weekday: "short" }),
    line2: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  };
}

// ── Stake presets ─────────────────────────────────────────────────────────
// Presets give daily refund amounts that are multiples of ₹50 or $0.50.
export function getStakePresets(
  scheduledDays: number,
  currency: string
): number[] {
  if (scheduledDays <= 0) return [];
  const dailyMultiples =
    currency === "INR" ? [50, 100, 200, 500] : [0.5, 1, 2, 5];
  return dailyMultiples.map((d) => Math.round(d * scheduledDays * 100) / 100);
}

// ── Scheduled dates ───────────────────────────────────────────────────────
/** All calendar days in the commitment range that fall on committed daysOfWeek */
export function getScheduledDates(c: Commitment): string[] {
  const result: string[] = [];
  const start = new Date(c.startDate + "T00:00:00");
  const end = new Date(c.endDate + "T00:00:00");
  const cursor = new Date(start);
  while (cursor <= end) {
    if (c.daysOfWeek.includes(cursor.getDay())) {
      result.push(localDateStr(cursor)); // local date, NOT toISOString()
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function getFirstScheduledDate(c: Commitment): string | null {
  const dates = getScheduledDates(c);
  return dates.length > 0 ? dates[0] : null;
}

export function getPastScheduledDates(c: Commitment): string[] {
  const today = getTodayStr();
  return getScheduledDates(c).filter((d) => d < today);
}

export function isTodayScheduled(c: Commitment): boolean {
  return getScheduledDates(c).includes(getTodayStr());
}

export function getTotalCommittedDays(c: Commitment): number {
  return getScheduledDates(c).length;
}

// ── Financials ────────────────────────────────────────────────────────────
export function getRefundPerDay(c: Commitment): number {
  const total = getTotalCommittedDays(c);
  if (total <= 0) return 0;
  return Math.round((c.stakeAmount / total) * 100) / 100;
}

export function getVerifiedCheckIns(c: Commitment): CheckIn[] {
  return c.checkIns.filter((ci) => ci.verified);
}

export function getTotalRefunded(c: Commitment): number {
  return getVerifiedCheckIns(c).length * getRefundPerDay(c);
}

export function getAmountAtRisk(c: Commitment): number {
  return Math.max(0, c.stakeAmount - getTotalRefunded(c));
}

export function getMissedDates(c: Commitment): string[] {
  const today = getTodayStr();
  return getPastScheduledDates(c).filter(
    (d) => !c.checkIns.some((ci) => ci.date === d && ci.verified)
  );
}

export function getCheckInForDate(
  c: Commitment,
  date: string
): CheckIn | undefined {
  return c.checkIns.find((ci) => ci.date === date);
}

export function hasTodayCheckIn(c: Commitment): boolean {
  const today = getTodayStr();
  return c.checkIns.some((ci) => ci.date === today && ci.verified);
}

// ── Status helpers ────────────────────────────────────────────────────────
export function isActive(c: Commitment): boolean {
  const today = getTodayStr();
  return c.startDate <= today && c.endDate >= today;
}

export function isExpired(c: Commitment): boolean {
  return c.endDate < getTodayStr();
}

export function getDaysRemaining(c: Commitment): number {
  const today = new Date(getTodayStr() + "T00:00:00");
  const end = new Date(c.endDate + "T00:00:00");
  return Math.max(
    0,
    Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
}

export function getSuccessRate(c: Commitment): number {
  const past = getPastScheduledDates(c).length;
  if (past === 0) return 0;
  return Math.round((getVerifiedCheckIns(c).length / past) * 100);
}

export function isPerfectSoFar(c: Commitment): boolean {
  return getMissedDates(c).length === 0;
}

export function getPeriodLabel(days: number): string {
  if (days <= 7) return "1 Week";
  if (days <= 14) return "2 Weeks";
  if (days <= 31) return "~1 Month";
  return "~3 Months";
}

// ── Countdown ─────────────────────────────────────────────────────────────
export function getMsUntilDeadline(): number {
  const now = new Date();
  const deadline = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 0
  );
  return Math.max(0, deadline.getTime() - now.getTime());
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Deadline passed";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}

export function isDeadlinePassed(): boolean {
  return getMsUntilDeadline() === 0;
}
