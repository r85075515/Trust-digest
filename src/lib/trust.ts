import type { TrustBreakdown } from "./types";

/** Sum of weighted factors; clamped 0–100. Demo heuristic only — not a fact-checker. */
export function computeTrustScore(b: TrustBreakdown): number {
  const sum =
    b.sourceDiversity +
    b.outletReputation +
    b.crossCorroboration +
    b.recencyClarity;
  return Math.max(0, Math.min(100, Math.round(sum)));
}

export function trustLabel(score: number): string {
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  return "Low";
}

export function trustColorClass(score: number): string {
  if (score >= 75) return "text-trust-high bg-green-50 border-green-200";
  if (score >= 50) return "text-trust-mid bg-yellow-50 border-yellow-200";
  return "text-trust-low bg-red-50 border-red-200";
}

export const TRUST_FACTOR_LABELS: Record<
  keyof TrustBreakdown,
  { en: string; "zh-TW": string; max: number }
> = {
  sourceDiversity: {
    en: "Source diversity",
    "zh-TW": "來源多樣性",
    max: 25,
  },
  outletReputation: {
    en: "Outlet reputation",
    "zh-TW": "媒體聲譽",
    max: 25,
  },
  crossCorroboration: {
    en: "Cross-corroboration",
    "zh-TW": "交叉驗證",
    max: 25,
  },
  recencyClarity: {
    en: "Recency & clarity",
    "zh-TW": "時效與清晰度",
    max: 25,
  },
};
