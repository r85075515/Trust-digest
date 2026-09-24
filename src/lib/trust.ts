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
  "obituary", "obituaries", "passed away", "rip", "r.i.p.",
  "死亡", "身亡", "遇難", "遇害", "喪命", "失蹤", "失踪", "兇殺", "凶杀",
  "謀殺", "谋杀", "槍擊", "枪击", "命案", "罹難", "罹难", "罹難者",
  "去世", "過世", "过世", "逝世", "英年早逝", "病逝", "離世", "离世",
  "死訊", "死讯", "訃聞", "讣闻",
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

/** Cap for celebrity death rumor with no mainstream obituaries (never high trust). */
export const DEATH_RUMOR_UNCONFIRMED_CAP = 45;

/** Cap when mainstream sources debunk a death rumor. */
export const DEATH_RUMOR_DEBUNK_CAP = 55;

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

// ---------------------------------------------------------------------------
// Celebrity fake-death / death-rumor path (pattern-based; no person hardcodes)
// ---------------------------------------------------------------------------

/** Lexical signals that a cluster is about someone dying (rumor or confirmed). */
const DEATH_RUMOR_KEYWORDS = [
  "died", "dies", "dead", "death", "deaths",
  "rip", "r.i.p", "r.i.p.",
  "obituary", "obituaries",
  "passed away", "passing away", "has died", "was killed",
  "killed in", "fatal",
  "去世", "過世", "过世", "逝世", "身亡", "英年早逝", "病逝", "離世", "离世",
  "死訊", "死讯", "訃聞", "讣闻", "不治", "喪生", "丧生", "猝逝", "驟逝",
];

/** Mainstream / community language that the person is alive or the rumor is a hoax. */
const DEATH_DEBUNK_KEYWORDS = [
  "alive", "not dead", "still alive", "death hoax", "fake death", "false rumor",
  "debunked", "hoax", "is fine", "doing well", "back to work", "returns to work",
  "denied reports", "denies death", "not passed away",
  "還活著", "还活着", "並未去世", "并未去世", "沒死", "没死", "健在",
  "假死", "死亡謠言", "死亡谣言", "打臉", "打脸", "闢謠", "辟谣",
  "謠言粉碎", "谣传不实", "謠傳不實", "並未過世", "并未过世", "平安",
];

/**
 * Domains that commonly publish mainstream obituaries / confirmations.
 * Pattern: wire + major news + major entertainment trades + TW majors.
 * Community / gossip-only hosts are intentionally excluded.
 */
const MAINSTREAM_OBITUARY_DOMAINS = new Set([
  "bbc.com",
  "bbci.co.uk",
  "reuters.com",
  "apnews.com",
  "npr.org",
  "nytimes.com",
  "theguardian.com",
  "washingtonpost.com",
  "cbsnews.com",
  "cnn.com",
  "latimes.com",
  "abcnews.go.com",
  "nbcnews.com",
  "ft.com",
  "wsj.com",
  // TW mainstream
  "udn.com",
  "ltn.com.tw",
  "chinatimes.com",
  "cna.com.tw",
  "storm.mg",
  "tw.news.yahoo.com",
  "news.pts.org.tw",
  "setn.com",
  "news.ebc.net.tw",
  "tvbs.com.tw",
  // Entertainment trades that often confirm celeb deaths
  "billboard.com",
  "rollingstone.com",
  "variety.com",
  "hollywoodreporter.com",
  "etonline.com",
]);

/** Forum / community heat hosts — not mainstream obituaries. */
const COMMUNITY_HEAT_DOMAINS = new Set([
  "ptt.cc",
  "dcard.tw",
  "today.line.me",
  "reddit.com",
  "x.com",
  "twitter.com",
  "facebook.com",
]);

/** Soft celebrity-lane lexicon (roles / genres — no specific person names). */
const CELEBRITY_LANE_RE =
  /celebrity|celebrities|celeb\b|actor|actress|singer|idol|pop star|movie star|hollywood|k-?pop|j-?pop|showbiz|藝人|男星|女星|偶像|網紅|影劇|娛樂圈|娱乐圈|演藝|芸能|연예|俳優|女優/i;

export type CelebrityDeathPath =
  | "confirmed_obituary"
  | "unconfirmed_rumor"
  | "debunked"
  | "disputed";

export function isDeathRumorText(
  ...parts: Array<string | undefined | null>
): boolean {
  const text = parts.filter(Boolean).join(" ");
  if (!text.trim()) return false;
  const lower = text.toLowerCase();
  return DEATH_RUMOR_KEYWORDS.some((k) => {
    if (/[a-z]/i.test(k)) return lower.includes(k.toLowerCase());
    return text.includes(k);
  });
}

export function isDeathDebunkText(
  ...parts: Array<string | undefined | null>
): boolean {
  const text = parts.filter(Boolean).join(" ");
  if (!text.trim()) return false;
  const lower = text.toLowerCase();
  return DEATH_DEBUNK_KEYWORDS.some((k) => {
    if (/[a-z]/i.test(k)) return lower.includes(k.toLowerCase());
    return text.includes(k);
  });
}

function normalizeDomain(domain: string): string {
  return domain.replace(/^www\./, "").toLowerCase();
}

export function isMainstreamObituaryDomain(domain: string): boolean {
  const d = normalizeDomain(domain);
  if (MAINSTREAM_OBITUARY_DOMAINS.has(d)) return true;
  const parts = d.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(-2).join(".");
    if (MAINSTREAM_OBITUARY_DOMAINS.has(parent)) return true;
  }
  return false;
}

export function isCommunityHeatDomain(domain: string): boolean {
  const d = normalizeDomain(domain);
  if (COMMUNITY_HEAT_DOMAINS.has(d)) return true;
  // PTT board paths sometimes appear as ptt.cc subpaths already covered
  return d.endsWith(".ptt.cc") || d === "mobile.twitter.com";
}

export function countMainstreamObituaryPublishers(
  domains: Array<string | undefined | null>
): number {
  const seen = new Set<string>();
  for (const raw of domains) {
    if (!raw) continue;
    const d = normalizeDomain(raw);
    if (!isMainstreamObituaryDomain(d)) continue;
    // Canonicalize to parent when listed
    const parts = d.split(".");
    const parent = parts.length > 2 ? parts.slice(-2).join(".") : d;
    const key = MAINSTREAM_OBITUARY_DOMAINS.has(d)
      ? d
      : MAINSTREAM_OBITUARY_DOMAINS.has(parent)
        ? parent
        : d;
    seen.add(key);
  }
  return seen.size;
}

export function isCelebrityLikeLane(
  category: string | undefined,
  ...parts: Array<string | undefined | null>
): boolean {
  if (category === "entertainment" || category === "eastAsiaGossip") return true;
  const text = parts.filter(Boolean).join(" ");
  return CELEBRITY_LANE_RE.test(text);
}

/**
 * Classify celebrity death-rumor clusters for honest trust labeling.
 * Returns null when the cluster is not a celebrity-lane death rumor.
 *
 * Paths:
 * - confirmed_obituary: ≥2 mainstream publishers cover the death → casualty cap;
 *   honesty may be cautious / multi_agree (never green "High" via score cap).
 * - unconfirmed_rumor: community heat / rumor language, no mainstream obituaries
 *   → 未確認／審慎, never high trust; still card-eligible.
 * - debunked: mainstream / explicit language says alive or hoax → 多源打臉.
 * - disputed: death rumor + alive/hoax signals mixed → 敘述有分歧.
 */
export function classifyCelebrityDeathRumor(opts: {
  category?: string;
  texts: Array<string | undefined | null>;
  domains: Array<string | undefined | null>;
  /** True when cluster came from / matched forum heat without news verify. */
  hasCommunityHeat?: boolean;
}): CelebrityDeathPath | null {
  const blob = opts.texts.filter(Boolean).join(" ");
  if (!blob.trim()) return null;
  if (!isCelebrityLikeLane(opts.category, blob)) return null;
  if (!isDeathRumorText(blob) && !isDeathDebunkText(blob)) return null;

  const mainstreamCount = countMainstreamObituaryPublishers(opts.domains);
  const communityOnly =
    opts.hasCommunityHeat === true ||
    opts.domains.filter(Boolean).every((d) => isCommunityHeatDomain(String(d)));
  const hasRumorLang = isDevelopingGossipText(blob) || communityOnly;
  const hasDebunk = isDeathDebunkText(blob);
  const hasDeathClaim = isDeathRumorText(blob);

  if (hasDebunk && hasDeathClaim && mainstreamCount >= 1) {
    // Mainstream present + alive/hoax language while death is also claimed
    return "debunked";
  }
  if (hasDebunk && !hasDeathClaim) {
    return "debunked";
  }
  if (hasDebunk && hasDeathClaim && mainstreamCount === 0) {
    return "disputed";
  }
  if (mainstreamCount >= 2 && hasDeathClaim) {
    return "confirmed_obituary";
  }
  if (mainstreamCount === 1 && hasDeathClaim && !hasRumorLang) {
    // Single mainstream obituary — treat as developing confirmed, still capped
    return "confirmed_obituary";
  }
  if (hasDeathClaim && mainstreamCount === 0) {
    return "unconfirmed_rumor";
  }
  if (hasDeathClaim && hasRumorLang && mainstreamCount < 2) {
    return "unconfirmed_rumor";
  }
  return null;
}

export function applyTrustCaps(
  score: number,
  opts: {
    isCasualty?: boolean;
    isRumorGossip?: boolean;
    deathPath?: CelebrityDeathPath | null;
  } = {}
): number {
  let s = score;
  if (opts.isCasualty) s = Math.min(s, CASUALTY_SCORE_CAP);
  if (opts.isRumorGossip) s = Math.min(s, RUMOR_GOSSIP_SCORE_CAP);
  if (opts.deathPath === "unconfirmed_rumor") {
    s = Math.min(s, DEATH_RUMOR_UNCONFIRMED_CAP);
  } else if (opts.deathPath === "debunked" || opts.deathPath === "disputed") {
    s = Math.min(s, DEATH_RUMOR_DEBUNK_CAP);
  } else if (opts.deathPath === "confirmed_obituary") {
    s = Math.min(s, CASUALTY_SCORE_CAP);
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}

export type HonestyKind =
  | "multi_agree"
  | "single"
  | "disagree"
  | "unconfirmed"
  | "cautious"
  | "debunk";

export function honestyKind(opts: {
  sourceCount: number;
  hasDisagreement?: boolean;
  isCasualty?: boolean;
  isRumorGossip?: boolean;
  deathPath?: CelebrityDeathPath | null;
}): HonestyKind {
  const path = opts.deathPath;
  if (path === "debunked") return "debunk";
  if (path === "disputed") return "disagree";
  if (path === "unconfirmed_rumor") {
    if ((opts.sourceCount ?? 0) <= 1) return "unconfirmed";
    return "cautious";
  }
  if (path === "confirmed_obituary") {
    // Multi-source obituaries may show N源一致, but score stays casualty-capped.
    if (opts.hasDisagreement) return "disagree";
    if ((opts.sourceCount ?? 0) <= 1) return "cautious";
    return "multi_agree";
  }
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
      case "debunk":
        return n >= 2 ? "多源打臉" : "打臉";
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
    case "debunk":
      return n >= 2 ? "Multi-source debunk" : "Debunked";
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
    case "debunk":
      return "text-violet-900 bg-violet-50 border-violet-200";
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
