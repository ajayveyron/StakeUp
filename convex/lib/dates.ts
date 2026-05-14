import type { Doc } from "../_generated/dataModel";

type ScheduleCommitment = Pick<
  Doc<"commitments">,
  "daysOfWeek" | "startDate" | "endDate"
>;

function dateStrInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not format date");
  }

  return `${year}-${month}-${day}`;
}

export function todayInTimeZone(timeZone: string): string {
  return dateStrInTimeZone(new Date(), timeZone);
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return (
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

export function getScheduledDates(c: ScheduleCommitment): string[] {
  const result: string[] = [];
  const start = new Date(`${c.startDate}T00:00:00`);
  const end = new Date(`${c.endDate}T00:00:00`);
  const cursor = new Date(start);

  while (cursor <= end) {
    if (c.daysOfWeek.includes(cursor.getDay())) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, "0");
      const day = String(cursor.getDate()).padStart(2, "0");
      result.push(`${year}-${month}-${day}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export function getRefundPerDay(c: ScheduleCommitment & { pactAmount: number }) {
  const total = getScheduledDates(c).length;
  if (total <= 0) return 0;
  return Math.round((c.pactAmount / total) * 100) / 100;
}

export function isScheduledDate(c: ScheduleCommitment, date: string): boolean {
  return getScheduledDates(c).includes(date);
}
