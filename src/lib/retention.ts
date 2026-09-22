/** Max age for stored / displayed stories (days). */
export const RETENTION_DAYS = 30;

export type DayRange = "today" | "7d" | "30d";

export const DAY_RANGE_LABELS: Record<
  DayRange,
  { en: string; "zh-TW": string }
> = {
  today: { en: "Today", "zh-TW": "今天" },
  "7d": { en: "Last 7 days", "zh-TW": "近7天" },
  "30d": { en: "Last 30 days", "zh-TW": "近30天" },
};

/** Start of calendar day in Asia/Taipei (UTC+8, no DST). */
export function startOfTaipeiDay(now = new Date()): Date {
  const mag = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const y = mag.getUTCFullYear();
  const m = mag.getUTCMonth();
  const d = mag.getUTCDate();
  // Midnight Taipei = 16:00 previous UTC day
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - 8 * 60 * 60 * 1000);
}

export function isWithinRetention(
  publishedAt: string,
  now = new Date(),
  days = RETENTION_DAYS
): boolean {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return false;
  return now.getTime() - t <= days * 24 * 60 * 60 * 1000;
}

export function isWithinDayRange(
  publishedAt: string,
  range: DayRange,
  now = new Date()
): boolean {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return false;
  if (range === "today") {
    return t >= startOfTaipeiDay(now).getTime();
  }
  const days = range === "7d" ? 7 : 30;
  return now.getTime() - t <= days * 24 * 60 * 60 * 1000;
}
