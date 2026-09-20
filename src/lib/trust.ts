import type { Language, TrustBreakdown } from "./types";

/** Sum of weighted factors; clamped 0–100. Demo heuristic only — not a fact-checker. */
export function computeTrustScore(b: TrustBreakdown): number {
  const sum =
    b.sourceDiversity +
    b.outletReputation +
    b.crossCorroboration +
    b.recencyClarity;
  return Math.max(0, Math.min(100, Math.round(sum)));
}

/** Developing death / missing / crime / disaster casualty signals. */
const CASUALTY_KEYWORDS = [
  "death", "deaths", "dead", "died", "dies", "dying", "killed", "killing", "killings",
  "murder", "murdered", "homicide", "shooting", "shot dead", "massacre",
  "missing", "missing person", "body found", "bodies found",
  "casualty", "casualties", "fatal", "fatally", "fatalities",
  "死亡", "身亡", "遇難", "遇害", "喪命", "失蹤", "失踪", "兇殺", "凶杀",
  "謀殺", "谋杀", "槍擊", "枪击", "命案", "罹難", "罹难", "罹難者",
];

export function isDevelopingCasualtyText(...parts: Array<string | undefined | null>): boolean {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (!text.trim()) return false;
  return CASUALTY_KEYWORDS.some((k) => text.includes(k.toLowerCase()));
}

/** Cap numeric score for developing casualty stories (never green "high"). */
export const CASUALTY_SCORE_CAP = 55;

/** Cap for developing / single-source rumor gossip (绯闻未证实 etc.). */
export const RUMOR_GOSSIP_SCORE_CAP = 55;

/** Developing / unverified gossip & rumor signals (EN + ZH). */
const RUMOR_GOSSIP_KEYWORDS = [
  "allegedly", "alleged", "rumour", "rumor", "rumored", "rumoured",
  "unconfirmed", "unverified", "sources say", "insiders say", "reportedly",
  "according to sources", "according to reports", "speculation",
  "爆料未證實", "爆料未证实", "未證實", "未证实", "緋聞未證實", "绯闻未证实",
  "緋聞", "绯闻", "傳出", "傳", "據傳", "据传", "網傳", "网传",
  "疑似", "八卦爆料", "獨家爆料", "独家爆料", "有人爆料",
];

export function isDevelopingGossipText(
  ...parts: Array<string | undefined | null>
): boolean {
  const text = parts.filter(Boolean).join(" ");
  if (!text.trim()) return false;
  const lower = text.toLowerCase();
  // Avoid false positive on lone CJK 「傳」 inside unrelated compounds by also
  // checking phrase forms; still allow common gossip markers.
  return RUMOR_GOSSIP_KEYWORDS.some((k) => {
    if (/[a-z]/i.test(k)) return lower.includes(k.toLowerCase());
    return text.includes(k);
  });
}

export function applyTrustCaps(
  score: number,
  opts: { isCasualty?: boolean; isRumorGossip?: boolean } = {}
): number {
  let s = score;
  if (opts.isCasualty) s = Math.min(s, CASUALTY_SCORE_CAP);
  if (opts.isRumorGossip) s = Math.min(s, RUMOR_GOSSIP_SCORE_CAP);
  return Math.max(0, Math.min(100, Math.round(s)));
}

export type HonestyKind =
  | "multi_agree"
  | "single"
  | "disagree"
  | "unconfirmed"
  | "cautious";

export function honestyKind(opts: {
  sourceCount: number;
  hasDisagreement?: boolean;
  isCasualty?: boolean;
  isRumorGossip?: boolean;
}): HonestyKind {
  if (opts.isCasualty || opts.isRumorGossip) {
    // Developing casualty / rumor gossip: never claim multi-source "high trust"
    if (opts.hasDisagreement) return "unconfirmed";
    if ((opts.sourceCount ?? 0) <= 1) return "unconfirmed";
    return "cautious";
  }
  if (opts.hasDisagreement) return "disagree";
  if ((opts.sourceCount ?? 0) <= 1) return "single";
  return "multi_agree";
}

export function honestyLabel(
  kind: HonestyKind,
  sourceCount: number,
  lang: Language
): string {
  const n = Math.max(0, sourceCount);
  if (lang === "zh-TW") {
    switch (kind) {
      case "multi_agree":
        return `${n}源一致`;
      case "single":
        return "僅1源";
      case "disagree":
        return "敘述有分歧";
      case "unconfirmed":
        return "未確認";
      case "cautious":
        return "審慎";
    }
  }
  switch (kind) {
    case "multi_agree":
      return `${n} sources agree`;
    case "single":
      return "1 source only";
    case "disagree":
      return "Accounts differ";
    case "unconfirmed":
      return "Unconfirmed";
    case "cautious":
      return "Cautious";
  }
}

/** Soft colors — prefer slate/amber over big green "High trust". */
export function honestyColorClass(kind: HonestyKind): string {
  switch (kind) {
    case "multi_agree":
      return "text-slate-700 bg-slate-50 border-slate-200";
    case "single":
      return "text-slate-600 bg-slate-50 border-slate-200";
    case "disagree":
      return "text-amber-800 bg-amber-50 border-amber-200";
    case "unconfirmed":
      return "text-amber-900 bg-amber-50 border-amber-300";
    case "cautious":
      return "text-amber-800 bg-amber-50 border-amber-200";
  }
}

/** @deprecated Prefer honestyLabel / honestyKind for UI. */
export function trustLabel(score: number): string {
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  return "Low";
}

/** @deprecated Prefer honestyColorClass. */
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
