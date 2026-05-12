import { Commitment, GoalType } from "@/contexts/CommitmentsContext";

export function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(amount: number, currency = "INR"): string {
  if (currency === "INR") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return `$${amount.toLocaleString("en-US")}`;
}

export function getEarningsPerCheckIn(c: Commitment): number {
  if (c.targetCount <= 0) return 0;
  return Math.round((c.stakeAmount / c.targetCount) * 100) / 100;
}

export function getTotalEarned(c: Commitment): number {
  return c.checkIns.length * getEarningsPerCheckIn(c);
}

export function getTotalAtRisk(c: Commitment): number {
  return c.stakeAmount - getTotalEarned(c);
}

export function isActive(c: Commitment): boolean {
  const today = getTodayStr();
  return c.startDate <= today && c.endDate >= today;
}

export function isExpired(c: Commitment): boolean {
  return c.endDate < getTodayStr();
}

export function hasCheckedInToday(c: Commitment): boolean {
  return c.checkIns.some((ci) => ci.date === getTodayStr());
}

export function hasCheckedInOnDate(c: Commitment, date: string): boolean {
  return c.checkIns.some((ci) => ci.date === date);
}

export function getDaysInPeriod(c: Commitment): number {
  const start = new Date(c.startDate + "T00:00:00");
  const end = new Date(c.endDate + "T00:00:00");
  return (
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

export function getDaysRemaining(c: Commitment): number {
  const today = new Date(getTodayStr() + "T00:00:00");
  const end = new Date(c.endDate + "T00:00:00");
  const diff = Math.round(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, diff);
}

export function getMissedDays(c: Commitment): number {
  const today = getTodayStr();
  const start = new Date(c.startDate + "T00:00:00");
  const end = new Date(
    (today < c.endDate ? today : c.endDate) + "T00:00:00"
  );

  let missed = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (dateStr !== today && !hasCheckedInOnDate(c, dateStr)) {
      missed++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return missed;
}

export function getSuccessRate(c: Commitment): number {
  const total = getDaysInPeriod(c);
  if (total <= 0) return 0;
  return Math.round((c.checkIns.length / Math.min(c.targetCount, total)) * 100);
}

export function goalTypeLabel(type: GoalType): string {
  switch (type) {
    case "content":
      return "Content Creation";
    case "steps":
      return "Daily Steps";
    case "exercise":
      return "Exercise";
    case "reading":
      return "Reading";
    case "custom":
      return "Custom";
  }
}

export function goalTypeDefaultUnit(type: GoalType): string {
  switch (type) {
    case "content":
      return "posts";
    case "steps":
      return "sessions";
    case "exercise":
      return "workouts";
    case "reading":
      return "sessions";
    case "custom":
      return "check-ins";
  }
}

export function getPeriodLabel(startDate: string, endDate: string): string {
  const days = Math.round(
    (new Date(endDate + "T00:00:00").getTime() -
      new Date(startDate + "T00:00:00").getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (days <= 7) return "1 Week";
  if (days <= 14) return "2 Weeks";
  if (days <= 31) return "1 Month";
  if (days <= 93) return "3 Months";
  return `${days} Days`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
