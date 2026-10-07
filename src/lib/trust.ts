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

// ---------------------------------------------------------------------------
// Trust Score v2 — multi-source cross-verification weighting
//
// v2 keeps every existing guardrail untouched:
//   - TrustBreakdown shape (4 factors, 0-25 each) — UI depends on it
//   - computeTrustScore (plain sum, clamp 0-100)
//   - all caps (CASUALTY 55 / RUMOR_GOSSIP 55 / DEATH_RUMOR_UNCONFIRMED 45 /
//     DEATH_RUMOR_DEBUNK 55) and honestyKind / honestyLabel semantics
// v2 only changes HOW the four factor scores are computed:
//   1. crossCorroboration: independent-source dedup. Outlets that all cite the
//      same wire / original ("according to X", "據X報導") count as ONE
//      independent source, no matter how many republish it.
//   2. sourceDiversity: media-group dedup (bbc.com == bbci.co.uk, yahoo TW ==
//      yahoo) + tier-layer bonus; capped when everyone cites one wire.
//   3. outletReputation: tiered reputation table (wire / tier1 / tier2 / TW
//      majors / vertical / aggregator / gossip / community) instead of a
//      single flat number per domain.
//   4. recencyClarity: steeper 24h decay + fuzzy-timestamp penalty.
//
// All functions are pure and deterministic: no LLM, no network, no randomness.
// ---------------------------------------------------------------------------

/** Tier reputation score per publisher domain (0-25). Parent-domain fallback. */
const OUTLET_TIER_SCORE: Record<string, number> = {
  // Wire services — highest prior
  "reuters.com": 25,
  "apnews.com": 25,
  // Tier 1 international
  "bbc.com": 23,
  "bbci.co.uk": 23,
  "nytimes.com": 23,
  "npr.org": 23,
  "theguardian.com": 22,
  "washingtonpost.com": 22,
  "ft.com": 22,
  "wsj.com": 22,
  "bloomberg.com": 22,
  "news.mit.edu": 23,
  // Tier 2 international
  "cnn.com": 21,
  "nbcnews.com": 20,
  "abcnews.go.com": 20,
  "cbsnews.com": 20,
  "news.sky.com": 20,
  "sky.com": 20,
  "latimes.com": 19,
  // TW tier 1 (wire + public + investigative)
  "cna.com.tw": 22,
  "news.pts.org.tw": 21,
  "twreporter.org": 21,
  // TW tier 2 majors
  "udn.com": 19,
  "ltn.com.tw": 19,
  "chinatimes.com": 18,
  "storm.mg": 18,
  "tvbs.com.tw": 18,
  "setn.com": 17,
  "news.ebc.net.tw": 17,
  "tw.news.yahoo.com": 17,
  "yahoo.com": 15,
  "finance.yahoo.com": 15,
  // Vertical / tech / professional
  "techcrunch.com": 18,
  "arstechnica.com": 19,
  "wired.com": 18,
  "theverge.com": 17,
  "engadget.com": 16,
  "sciencedaily.com": 17,
  // Entertainment trades
  "variety.com": 17,
  "hollywoodreporter.com": 17,
  "billboard.com": 16,
  "rollingstone.com": 16,
  "etonline.com": 15,
  // TW entertainment / online-native
  "ettoday.net": 14,
  "star.ettoday.net": 14,
  "mirrormedia.mg": 15,
  "newtalk.tw": 14,
  "soompi.com": 14,
  // Aggregators (republish, no original reporting)
  "news.google.com": 12,
  // Gossip / tabloid
  "tmz.com": 11,
  "justjared.com": 12,
  "hollywoodlife.com": 11,
  "koreaboo.com": 10,
  "today.line.me": 12,
  "sina.com.cn": 12,
  "sina.com": 12,
  // Community heat (not newsrooms)
  "ptt.cc": 7,
  "dcard.tw": 7,
  "reddit.com": 8,
  "x.com": 6,
  "twitter.com": 6,
  "facebook.com": 6,
};

const DEFAULT_TIER_SCORE = 10; // unknown blogs / lower prior

/** Domains that belong to the same media group (dedup for diversity counting). */
const MEDIA_GROUP_ALIASES: Record<string, string> = {
  "bbc.com": "bbc",
  "bbci.co.uk": "bbc",
  "yahoo.com": "yahoo",
  "tw.news.yahoo.com": "yahoo",
  "finance.yahoo.com": "yahoo",
  "ettoday.net": "ettoday",
  "star.ettoday.net": "ettoday",
  "news.sky.com": "sky",
  "sky.com": "sky",
  "abcnews.go.com": "abc",
  "news.ebc.net.tw": "ebc",
  "mirrormedia.mg": "mirrormedia",
  "newtalk.tw": "newtalk",
  "news.google.com": "google-news",
  "today.line.me": "line-today",
};

function v2NormalizeDomain(domain: string): string {
  return (domain || "unknown").replace(/^www\./, "").toLowerCase();
}

/** Canonical media-group key: same owner on different domains counts once. */
export function mediaGroupKey(domain: string): string {
  const d = v2NormalizeDomain(domain);
  if (MEDIA_GROUP_ALIASES[d]) return MEDIA_GROUP_ALIASES[d];
  const parts = d.split(".");
  if (parts.length > 2) return parts.slice(-2).join(".");
  return d;
}

/** Tier reputation score for one publisher domain (0-25). */
export function tierReputationScore(domain: string): number {
  const d = v2NormalizeDomain(domain);
  if (OUTLET_TIER_SCORE[d] != null) return OUTLET_TIER_SCORE[d];
  const parts = d.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(-2).join(".");
    if (OUTLET_TIER_SCORE[parent] != null) return OUTLET_TIER_SCORE[parent];
  }
  return DEFAULT_TIER_SCORE;
}

/** Coarse tier band, used for the diversity layering bonus. */
function tierBand(domain: string): string {
  const s = tierReputationScore(domain);
  if (s >= 25) return "wire";
  if (s >= 21) return "tier1";
  if (s >= 17) return "tier2";
  if (s >= 14) return "vertical";
  if (s >= 11) return "aggregator";
  if (s >= 8) return "gossip";
  return "community";
}

// ---------------------------------------------------------------------------
// Attribution / independent-source detection
// ---------------------------------------------------------------------------

/** One publisher's contribution to a cluster, as seen by v2. */
export interface V2Outlet {
  domain: string;
  title: string;
  description: string;
}

const ATTRIBUTION_PATTERNS: RegExp[] = [
  // NOTE: deliberately case-sensitive on the captured origin's first letter —
  // with /i, "citing a reported threat…" would misfire on common nouns.
  /[Aa]ccording to ([A-Z][\w .&'\-]{1,40})/,
  /[Cc]iting ([A-Z][\w .&'\-]{1,40})/,
  /[Aa]s (?:first )?reported by ([A-Z][\w .&'\-]{1,40})/,
  /據([\u4e00-\u9fa5]{2,12})(?:報導|指出|表示|證實)/,
  /引述([\u4e00-\u9fa5A-Za-z .&'\-]{2,30})/,
  /([\u4e00-\u9fa5]{2,12})報導/,
];

function normalizeAttribution(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[''.]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect the single origin a piece attributes its reporting to, e.g.
 * "according to Reuters" / "據中央社報導". Returns null when the outlet
 * presents the reporting as its own (i.e. plausibly independent).
 */
export function detectAttributionOrigin(title: string, description: string): string | null {
  const text = `${title || ""} ${description || ""}`;
  for (const re of ATTRIBUTION_PATTERNS) {
    const m = text.match(re);
    if (m && m[1]) {
      const origin = normalizeAttribution(m[1]);
      if (origin.length >= 2) return origin;
    }
  }
  return null;
}

function tokenizeForSimilarity(text: string): Set<string> {
  const toks = new Set<string>();
  const lower = (text || "").toLowerCase();
  for (const w of lower.split(/[^a-z0-9\u4e00-\u9fa5]+/g)) {
    if (w.length >= 2) toks.add(w);
  }
  // CJK char bigrams so near-identical Chinese headlines score high
  const cjk = lower.replace(/[^\u4e00-\u9fa5]/g, "");
  for (let i = 0; i + 1 < cjk.length; i++) toks.add(cjk.slice(i, i + 2));
  return toks;
}

/** Jaccard similarity of two headlines (0-1). Pure, deterministic. */
export function titleSimilarity(a: string, b: string): number {
  const ta = tokenizeForSimilarity(a);
  const tb = tokenizeForSimilarity(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export interface IndependentSourceInfo {
  /** Number of genuinely independent reporting origins. */
  count: number;
  /** True when every outlet cites the same single origin (wire echo chamber). */
  sharedAttribution: boolean;
  /** Diagnostic: the deduped origin keys. */
  origins: string[];
}

/**
 * Collapse outlets to independent reporting origins:
 * - explicit attribution ("according to X") wins over publisher identity;
 * - near-identical headlines (similarity >= 0.8) with no attribution on either
 *   side are treated as copies of one original;
 * - otherwise each media group is its own origin.
 */
export function independentSourceCount(outlets: V2Outlet[]): IndependentSourceInfo {
  const n = outlets.length;
  if (n === 0) return { count: 0, sharedAttribution: false, origins: [] };

  // Union-find over outlet indexes
  const parent = outlets.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };

  const attrs = outlets.map((o) => detectAttributionOrigin(o.title, o.description));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ai = attrs[i];
      const aj = attrs[j];
      if (ai && aj && ai === aj) {
        union(i, j); // both cite the same origin
      } else if (!ai && !aj) {
        const gi = mediaGroupKey(outlets[i].domain);
        const gj = mediaGroupKey(outlets[j].domain);
        if (gi === gj) {
          union(i, j); // same media group
        } else if (titleSimilarity(outlets[i].title, outlets[j].title) >= 0.8) {
          union(i, j); // near-identical headline, no attribution: wire copy
        }
      }
    }
  }

  const groups = new Map<number, number[]>();
  outlets.forEach((_, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(i);
  });

  const origins: string[] = [];
  for (const members of groups.values()) {
    const attr = attrs[members[0]];
    origins.push(attr ? `attr:${attr}` : `pub:${mediaGroupKey(outlets[members[0]].domain)}`);
  }

  const sharedAttribution =
    origins.length === 1 && n > 1 && origins[0].startsWith("attr:");

  return { count: groups.size, sharedAttribution, origins };
}

// ---------------------------------------------------------------------------
// v2 factor scorers (each 0-25; TrustBreakdown shape unchanged)
// ---------------------------------------------------------------------------

/** v2 source diversity: media-group dedup + tier-layer bonus. */
export function scoreSourceDiversityV2(outlets: V2Outlet[], sharedAttribution: boolean): number {
  const groups = new Set(outlets.map((o) => mediaGroupKey(o.domain)));
  const n = groups.size;
  if (n <= 1) return 6;
  const bands = new Set([...groups].map((g) => tierBand(groupSampleDomain(outlets, g))));
  let s = 6 + (n - 1) * 6 + Math.min(4, bands.size);
  if (sharedAttribution) s = Math.min(s, 18); // N outlets, one wire: not diverse sourcing
  return Math.max(0, Math.min(25, Math.round(s)));
}

function groupSampleDomain(outlets: V2Outlet[], group: string): string {
  const o = outlets.find((x) => mediaGroupKey(x.domain) === group);
  return o ? o.domain : "unknown";
}

/** v2 outlet reputation: 0.55 * best tier + 0.45 * mean tier. */
export function scoreOutletReputationV2(outlets: V2Outlet[]): number {
  if (outlets.length === 0) return 0;
  const scores = outlets.map((o) => tierReputationScore(o.domain));
  const max = Math.max(...scores);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.max(0, Math.min(25, Math.round(0.55 * max + 0.45 * mean)));
}

/** v2 cross-corroboration: rewards independent origins, punishes wire echo. */
export function scoreCrossCorroborationV2(
  outlets: V2Outlet[],
  info: IndependentSourceInfo,
  disagreementHint: string | null | undefined
): number {
  let s = info.count <= 1 ? 6 : Math.min(25, 6 + (info.count - 1) * 8);
  if (info.sharedAttribution) s = Math.min(s, 8); // all cite the same wire
  if (disagreementHint) s = Math.max(6, s - 8);
  return Math.max(0, Math.min(25, Math.round(s)));
}

/** v2 recency & clarity: 24h full score, then decaying; fuzzy timestamps penalized. */
export function scoreRecencyClarityV2(
  publishedAt: string,
  descriptionLength: number,
  opts: { fuzzyTimestamp?: boolean; nowMs?: number } = {}
): number {
  const now = opts.nowMs ?? Date.now();
  const parsed = Date.parse(publishedAt);
  const ageHours = Number.isNaN(parsed) ? 72 : (now - parsed) / 36e5;
  let s = 25;
  if (ageHours > 24) s -= 5;
  if (ageHours > 72) s -= 5;
  if (ageHours > 168) s -= 6;
  if (opts.fuzzyTimestamp || Number.isNaN(parsed)) s -= 4;
  if (descriptionLength < 80) s -= 4;
  return Math.max(0, Math.min(25, Math.round(s)));
}

export interface V2BreakdownInput {
  outlets: V2Outlet[];
  publishedAt: string;
  /** Total title+description length across members (for the clarity term). */
  descriptionLength: number;
  disagreementHint?: string | null;
  fuzzyTimestamp?: boolean;
  /** Test hook for determinism; defaults to Date.now(). */
  nowMs?: number;
}

export interface V2BreakdownDetail extends TrustBreakdown {
  independentCount: number;
  sharedAttribution: boolean;
  mediaGroups: string[];
  origins: string[];
}

/** Full v2 breakdown. Shape-compatible drop-in for buildTrustBreakdown. */
export function buildTrustBreakdownV2(input: V2BreakdownInput): TrustBreakdown {
  return v2BreakdownDetail(input);
}

export function v2BreakdownDetail(input: V2BreakdownInput): V2BreakdownDetail {
  const outlets = input.outlets.length
    ? input.outlets
    : [{ domain: "unknown", title: "", description: "" }];
  const info = independentSourceCount(outlets);
  const sourceDiversity = scoreSourceDiversityV2(outlets, info.sharedAttribution);
  const outletReputation = scoreOutletReputationV2(outlets);
  const crossCorroboration = scoreCrossCorroborationV2(outlets, info, input.disagreementHint);
  const recencyClarity = scoreRecencyClarityV2(input.publishedAt, input.descriptionLength, {
    fuzzyTimestamp: input.fuzzyTimestamp,
    nowMs: input.nowMs,
  });
  return {
    sourceDiversity,
    outletReputation,
    crossCorroboration,
    recencyClarity,
    independentCount: info.count,
    sharedAttribution: info.sharedAttribution,
    mediaGroups: [...new Set(outlets.map((o) => mediaGroupKey(o.domain)))],
    origins: info.origins,
  };
}
