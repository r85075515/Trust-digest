/**
 * Live RSS / Atom ingest helpers for Axiom.
 * Summarize + link only — never republish full articles.
 */

import type { Category, Story, TrustBreakdown } from "./types";
import { computeTrustScore } from "./trust";

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: Exclude<Category, "adult">;
  language: "zh-TW" | "en" | "mixed";
  domain: string;
}

/** Curated allow-list (verified HTTP 200 at last ingest design). Adult feeds excluded in v1. */
export const ALLOWED_FEEDS: FeedSource[] = [
  // International
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    category: "international",
    language: "en",
    domain: "bbc.com",
  },
  {
    id: "npr-world",
    name: "NPR World",
    url: "https://feeds.npr.org/1004/rss.xml",
    category: "international",
    language: "en",
    domain: "npr.org",
  },
  {
    id: "guardian-world",
    name: "The Guardian World",
    url: "https://www.theguardian.com/world/rss",
    category: "international",
    language: "en",
    domain: "theguardian.com",
  },
  {
    id: "nyt-world",
    name: "NYT World",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    category: "international",
    language: "en",
    domain: "nytimes.com",
  },
  // Finance
  {
    id: "cnbc-top",
    name: "CNBC",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    category: "finance",
    language: "en",
    domain: "cnbc.com",
  },
  {
    id: "marketwatch",
    name: "MarketWatch",
    url: "https://www.marketwatch.com/rss/topstories",
    category: "finance",
    language: "en",
    domain: "marketwatch.com",
  },
  {
    id: "yahoo-finance",
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
    category: "finance",
    language: "en",
    domain: "finance.yahoo.com",
  },
  {
    id: "bbc-business",
    name: "BBC Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    category: "finance",
    language: "en",
    domain: "bbc.com",
  },
  {
    id: "guardian-business",
    name: "The Guardian Business",
    url: "https://www.theguardian.com/business/rss",
    category: "finance",
    language: "en",
    domain: "theguardian.com",
  },
  // Tech
  {
    id: "techcrunch",
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    category: "tech",
    language: "en",
    domain: "techcrunch.com",
  },
  {
    id: "theverge",
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    category: "tech",
    language: "en",
    domain: "theverge.com",
  },
  {
    id: "bbc-tech",
    name: "BBC Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    category: "tech",
    language: "en",
    domain: "bbc.com",
  },
  {
    id: "arstechnica",
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    category: "tech",
    language: "en",
    domain: "arstechnica.com",
  },
  {
    id: "engadget",
    name: "Engadget",
    url: "https://www.engadget.com/rss.xml",
    category: "tech",
    language: "en",
    domain: "engadget.com",
  },
  // AI
  {
    id: "mit-ai",
    name: "MIT News AI",
    url: "https://news.mit.edu/rss/topic/artificial-intelligence2",
    category: "ai",
    language: "en",
    domain: "news.mit.edu",
  },
  {
    id: "wired-ai",
    name: "Wired AI",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    category: "ai",
    language: "en",
    domain: "wired.com",
  },
  {
    id: "sciencedaily-ai",
    name: "ScienceDaily AI",
    url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml",
    category: "ai",
    language: "en",
    domain: "sciencedaily.com",
  },
  {
    id: "google-ai-blog",
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
    category: "ai",
    language: "en",
    domain: "blog.google",
  },
  // Entertainment
  {
    id: "billboard",
    name: "Billboard",
    url: "https://www.billboard.com/feed/",
    category: "entertainment",
    language: "en",
    domain: "billboard.com",
  },
  {
    id: "variety",
    name: "Variety",
    url: "https://variety.com/feed/",
    category: "entertainment",
    language: "en",
    domain: "variety.com",
  },
  {
    id: "deadline",
    name: "Deadline",
    url: "https://deadline.com/feed/",
    category: "entertainment",
    language: "en",
    domain: "deadline.com",
  },
  // Beauty
  {
    id: "allure",
    name: "Allure",
    url: "https://www.allure.com/feed/rss",
    category: "beauty",
    language: "en",
    domain: "allure.com",
  },
  {
    id: "fashionista",
    name: "Fashionista",
    url: "https://fashionista.com/.rss/full/",
    category: "beauty",
    language: "en",
    domain: "fashionista.com",
  },
];

/** Domain → reputation prior (0–25). Heuristic only. */
export const OUTLET_REPUTATION: Record<string, number> = {
  "bbc.com": 24,
  "bbci.co.uk": 24,
  "reuters.com": 25,
  "apnews.com": 25,
  "npr.org": 23,
  "nytimes.com": 22,
  "theguardian.com": 21,
  "washingtonpost.com": 21,
  "ft.com": 22,
  "wsj.com": 22,
  "cnbc.com": 19,
  "marketwatch.com": 18,
  "finance.yahoo.com": 16,
  "yahoo.com": 15,
  "bloomberg.com": 22,
  "techcrunch.com": 18,
  "theverge.com": 17,
  "arstechnica.com": 19,
  "engadget.com": 16,
  "wired.com": 18,
  "news.mit.edu": 23,
  "mit.edu": 23,
  "sciencedaily.com": 17,
  "blog.google": 18,
  "openai.com": 16,
  "billboard.com": 16,
  "variety.com": 17,
  "deadline.com": 15,
  "hollywood.com": 16,
  "allure.com": 15,
  "fashionista.com": 14,
  "nasa.gov": 22,
};

export const USER_AGENT =
  "AxiomDigest/0.1 (+https://github.com/; educational multi-source news digest; summarize+link only)";

export interface RawFeedItem {
  feedId: string;
  outletName: string;
  domain: string;
  category: Exclude<Category, "adult">;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  imageUrl?: string;
}

export interface StoryCluster {
  category: Exclude<Category, "adult">;
  members: RawFeedItem[];
  primaryTitle: string;
  bestImage?: string;
  publishedAt: string;
  disagreementHint: string | null;
}

const STOP = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "can", "this", "that", "these", "those",
  "it", "its", "they", "them", "their", "he", "she", "his", "her", "we", "our",
  "you", "your", "i", "my", "not", "no", "yes", "after", "before", "over",
  "under", "into", "about", "up", "out", "off", "than", "then", "so", "if",
  "how", "what", "when", "where", "who", "which", "why", "new", "says", "say",
  "said", "report", "reports", "amid", "via", "per", "vs", "vs.",
]);

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t))
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Prefer titles with more Capitalized tokens / digits (concrete proper nouns). */
export function properNounScore(title: string): number {
  const words = title.split(/\s+/);
  let score = 0;
  for (const w of words) {
    if (/^[A-Z][a-z]/.test(w) || /^[A-Z]{2,}/.test(w) || /\d/.test(w)) score += 2;
    if (w.length > 6) score += 0.5;
  }
  return score;
}

export function clusterItems(
  items: RawFeedItem[],
  threshold = 0.38
): StoryCluster[] {
  const byCat = new Map<string, RawFeedItem[]>();
  for (const it of items) {
    const list = byCat.get(it.category) ?? [];
    list.push(it);
    byCat.set(it.category, list);
  }

  const clusters: StoryCluster[] = [];

  for (const [category, list] of byCat) {
    const used = new Set<number>();
    const tokens = list.map((i) => tokenize(i.title));

    for (let i = 0; i < list.length; i++) {
      if (used.has(i)) continue;
      const members = [list[i]];
      used.add(i);
      for (let j = i + 1; j < list.length; j++) {
        if (used.has(j)) continue;
        // Same URL = same story
        if (normalizeUrl(list[i].link) === normalizeUrl(list[j].link)) {
          members.push(list[j]);
          used.add(j);
          continue;
        }
        const sim = jaccard(tokens[i], tokens[j]);
        if (sim >= threshold) {
          members.push(list[j]);
          used.add(j);
        }
      }

      const primary = [...members].sort(
        (a, b) => properNounScore(b.title) - properNounScore(a.title)
      )[0];

      const bestImage =
        members.map((m) => m.imageUrl).find((u) => !!u) ?? undefined;

      const dates = members
        .map((m) => Date.parse(m.pubDate))
        .filter((n) => !Number.isNaN(n));
      const latest = dates.length
        ? new Date(Math.max(...dates)).toISOString()
        : new Date().toISOString();

      clusters.push({
        category: category as Exclude<Category, "adult">,
        members,
        primaryTitle: primary.title,
        bestImage,
        publishedAt: latest,
        disagreementHint: detectDisagreement(members),
      });
    }
  }

  return clusters;
}

function normalizeUrl(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    x.search = "";
    return x.toString().replace(/\/$/, "");
  } catch {
    return u;
  }
}

/** Very simple numeric / named-entity conflict heuristic. */
export function detectDisagreement(members: RawFeedItem[]): string | null {
  if (members.length < 2) return null;
  const numbers = members.map((m) => {
    const text = `${m.title} ${m.description}`;
    return new Set(
      (text.match(/\b\d+(?:\.\d+)?%?\b/g) ?? []).filter(
        (n) => !/^(19|20)\d{2}$/.test(n) // skip years
      )
    );
  });
  // If two members mention different exclusive numbers for similar tokens, flag
  const all = new Set<string>();
  const exclusive: string[] = [];
  for (const set of numbers) {
    for (const n of set) {
      if (all.has(n)) continue;
      // check if another set has a different number of same magnitude class
      all.add(n);
    }
  }
  // Compare pairwise: shared keyword context with conflicting figures
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = [...numbers[i]];
      const b = [...numbers[j]];
      if (a.length && b.length) {
        const onlyA = a.filter((x) => !numbers[j].has(x));
        const onlyB = b.filter((x) => !numbers[i].has(x));
        if (onlyA.length && onlyB.length) {
          exclusive.push(
            `Figures differ across outlets (e.g. ${onlyA[0]} vs ${onlyB[0]} in headlines/snippets).`
          );
        }
      }
    }
  }
  return exclusive[0] ?? null;
}

export function reputationForDomain(domain: string): number {
  const d = domain.replace(/^www\./, "").toLowerCase();
  if (OUTLET_REPUTATION[d] != null) return OUTLET_REPUTATION[d];
  // Try parent domain
  const parts = d.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(-2).join(".");
    if (OUTLET_REPUTATION[parent] != null) return OUTLET_REPUTATION[parent];
  }
  return 10; // unknown blogs / lower prior
}

export function buildTrustBreakdown(cluster: StoryCluster): TrustBreakdown {
  const uniqueDomains = new Set(
    cluster.members.map((m) => m.domain.replace(/^www\./, "").toLowerCase())
  );
  const sourceDiversity = Math.min(25, Math.round(uniqueDomains.size * 8));

  const reps = [...uniqueDomains].map((d) => reputationForDomain(d));
  const outletReputation = Math.min(
    25,
    Math.round(reps.reduce((a, b) => a + b, 0) / reps.length)
  );

  const size = cluster.members.length;
  let crossCorroboration = Math.min(25, 8 + (size - 1) * 7);
  if (cluster.disagreementHint) {
    crossCorroboration = Math.max(6, crossCorroboration - 8);
  }

  const ageMs = Date.now() - Date.parse(cluster.publishedAt);
  const ageHours = Number.isNaN(ageMs) ? 72 : ageMs / 36e5;
  let recency = 25;
  if (ageHours > 6) recency -= 3;
  if (ageHours > 24) recency -= 5;
  if (ageHours > 72) recency -= 6;
  if (ageHours > 168) recency -= 6;
  const descLen = cluster.members.reduce(
    (n, m) => n + (m.description?.length ?? 0) + m.title.length,
    0
  );
  if (descLen < 80) recency -= 4;
  if (descLen > 400) recency += 1;
  const recencyClarity = Math.max(0, Math.min(25, recency));

  return {
    sourceDiversity,
    outletReputation,
    crossCorroboration,
    recencyClarity,
  };
}

const TRENDING_KEYWORDS = [
  "breaking",
  "live",
  "record",
  "surge",
  "crash",
  "election",
  "war",
  "ceasefire",
  "ipo",
  "launch",
  "openai",
  "chatgpt",
  "apple",
  "google",
  "tesla",
  "fed",
  "inflation",
  "oscar",
  "grammy",
  "super bowl",
  "viral",
];

export function isPopularCluster(cluster: StoryCluster): boolean {
  if (cluster.members.length >= 2) return true;
  const t = cluster.primaryTitle.toLowerCase();
  return TRENDING_KEYWORDS.some((k) => t.includes(k));
}

export function isHeadlineCandidate(
  cluster: StoryCluster,
  breakdown: TrustBreakdown,
  trustScore: number
): boolean {
  const highRepCats: Category[] = ["international", "finance", "tech", "ai"];
  if (
    highRepCats.includes(cluster.category) &&
    cluster.members.length >= 2 &&
    breakdown.outletReputation >= 18
  ) {
    return true;
  }
  return trustScore >= 72 && breakdown.recencyClarity >= 18;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstImg(html: string): string | undefined {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function buildExtractiveDigest(cluster: StoryCluster): {
  summaryEn: string;
  bodyEn: string;
} {
  const outlets = [...new Set(cluster.members.map((m) => m.outletName))];
  const snippets = cluster.members
    .map((m) => stripHtml(m.description || ""))
    .filter((s) => s.length > 40);

  const uniqueSnips: string[] = [];
  for (const s of snippets) {
    if (!uniqueSnips.some((u) => jaccard(tokenize(u), tokenize(s)) > 0.7)) {
      uniqueSnips.push(s);
    }
  }

  const lede =
    uniqueSnips[0]?.slice(0, 280) ||
    `${cluster.primaryTitle}. Coverage from ${outlets.join(", ")}.`;

  const summaryEn =
    lede.length > 220 ? lede.slice(0, 217) + "…" : lede;

  const whatHappened = [
    cluster.primaryTitle + ".",
    ...uniqueSnips.slice(0, 4).map((s) => s.slice(0, 400)),
  ].join(" ");

  const why =
    `This cluster was assembled from ${cluster.members.length} feed item(s) ` +
    `across ${outlets.length} outlet(s) (${outlets.join(", ")}) in the ` +
    `${cluster.category} category. Axiom links out to each publisher; ` +
    `this digest only restates titles and short feed descriptions — not full articles.`;

  const agree =
    cluster.members.length >= 2
      ? `Multiple outlets are covering closely related headlines: ${cluster.members
          .map((m) => `"${m.title}" (${m.outletName})`)
          .slice(0, 5)
          .join("; ")}.`
      : `Currently a single-outlet feed item; corroboration may rise as other allow-listed sources pick up the story.`;

  const disagree = cluster.disagreementHint
    ? cluster.disagreementHint
    : "No clear numeric/name conflicts detected in the short feed snippets; always verify details on the publisher pages.";

  const uncertain =
    "Feed descriptions can omit context, updates, or corrections. Click through to the linked outlets for the latest full reporting. Trust scores are heuristics, not fact-check guarantees.";

  let bodyEn = [
    lede,
    "",
    "What happened",
    whatHappened,
    "",
    "Why it matters",
    why,
    "",
    "Sources agree / disagree",
    agree,
    disagree,
    "",
    "Still uncertain",
    uncertain,
    "",
    "Linked sources: " +
      cluster.members.map((m) => `${m.outletName}: ${m.link}`).join(" | "),
  ].join("\n");

  // Pad toward ~200+ words when source text allows
  const words = bodyEn.split(/\s+/).length;
  if (words < 200 && uniqueSnips.length) {
    bodyEn +=
      "\n\nAdditional feed context\n" +
      uniqueSnips
        .slice(0, 6)
        .map((s, i) => `(${i + 1}) ${s}`)
        .join("\n");
  }

  return { summaryEn, bodyEn };
}

export function pickBalancedClusters(
  clusters: StoryCluster[],
  targetMin = 12,
  targetMax = 24
): StoryCluster[] {
  const perCatTarget: Record<string, number> = {
    international: 4,
    finance: 4,
    tech: 4,
    ai: 3,
    entertainment: 4,
    beauty: 3,
  };

  const scored = clusters.map((c) => {
    const tb = buildTrustBreakdown(c);
    const score =
      computeTrustScore(tb) +
      (c.members.length - 1) * 8 +
      (Date.parse(c.publishedAt) || 0) / 1e12;
    return { c, score, tb };
  });

  scored.sort((a, b) => b.score - a.score);

  const picked: StoryCluster[] = [];
  const counts: Record<string, number> = {};

  for (const { c } of scored) {
    const n = counts[c.category] ?? 0;
    if (n >= (perCatTarget[c.category] ?? 3)) continue;
    picked.push(c);
    counts[c.category] = n + 1;
    if (picked.length >= targetMax) break;
  }

  // Fill to min if short
  if (picked.length < targetMin) {
    for (const { c } of scored) {
      if (picked.includes(c)) continue;
      picked.push(c);
      if (picked.length >= targetMin) break;
    }
  }

  return picked;
}

export type { Story };
