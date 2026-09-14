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
  category: Category;
  language: "zh-TW" | "en" | "mixed";
  domain: string;
}

/**
 * Curated allow-list (verified HTTP 200).
 * Entertainment = celebrity / pop culture (K-pop, J-pop, Hollywood, TW/HK/CN idols) — NOT Broadway reviews or film-festival academia.
 * Society = crime, accidents, public safety, civic incidents — not geopolitics or pure finance.
 */
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
  // Entertainment — celebrity / pop culture (TW·CN·JP·KR·US/EU)
  {
    id: "billboard",
    name: "Billboard",
    url: "https://www.billboard.com/feed/",
    category: "entertainment",
    language: "en",
    domain: "billboard.com",
  },
  {
    id: "rollingstone-music",
    name: "Rolling Stone Music",
    url: "https://www.rollingstone.com/music/music-news/feed/",
    category: "entertainment",
    language: "en",
    domain: "rollingstone.com",
  },
  {
    id: "soompi",
    name: "Soompi",
    url: "https://www.soompi.com/feed",
    category: "entertainment",
    language: "en",
    domain: "soompi.com",
  },
  {
    id: "koreaboo",
    name: "Koreaboo",
    url: "https://www.koreaboo.com/feed/",
    category: "entertainment",
    language: "en",
    domain: "koreaboo.com",
  },
  {
    id: "tmz",
    name: "TMZ",
    url: "https://www.tmz.com/rss.xml",
    category: "entertainment",
    language: "en",
    domain: "tmz.com",
  },
  {
    id: "hollywood-life",
    name: "Hollywood Life",
    url: "https://hollywoodlife.com/feed/",
    category: "entertainment",
    language: "en",
    domain: "hollywoodlife.com",
  },
  {
    id: "just-jared",
    name: "Just Jared",
    url: "https://www.justjared.com/feed/",
    category: "entertainment",
    language: "en",
    domain: "justjared.com",
  },
  {
    id: "et-online",
    name: "ET Online",
    url: "https://www.etonline.com/news/rss",
    category: "entertainment",
    language: "en",
    domain: "etonline.com",
  },
  {
    id: "bbc-entertainment",
    name: "BBC Entertainment",
    url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    category: "entertainment",
    language: "en",
    domain: "bbc.com",
  },
  // Society — crime, accidents, public safety, civic incidents
  {
    id: "cbs-crime",
    name: "CBS News Crime",
    url: "https://www.cbsnews.com/latest/rss/crime",
    category: "society",
    language: "en",
    domain: "cbsnews.com",
  },
  {
    id: "sky-uk",
    name: "Sky News UK",
    url: "https://feeds.skynews.com/feeds/rss/uk.xml",
    category: "society",
    language: "en",
    domain: "news.sky.com",
  },
  {
    id: "bbc-uk",
    name: "BBC UK",
    url: "https://feeds.bbci.co.uk/news/uk/rss.xml",
    category: "society",
    language: "en",
    domain: "bbc.com",
  },
  {
    id: "latimes-california",
    name: "LA Times California",
    url: "https://www.latimes.com/california/rss2.0.xml",
    category: "society",
    language: "en",
    domain: "latimes.com",
  },
  {
    id: "guardian-uk-news",
    name: "The Guardian UK News",
    url: "https://www.theguardian.com/uk-news/rss",
    category: "society",
    language: "en",
    domain: "theguardian.com",
  },
  {
    id: "npr-news",
    name: "NPR News",
    url: "https://feeds.npr.org/1001/rss.xml",
    category: "society",
    language: "en",
    domain: "npr.org",
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
  "rollingstone.com": 17,
  "soompi.com": 14,
  "koreaboo.com": 13,
  "tmz.com": 12,
  "hollywoodlife.com": 12,
  "justjared.com": 12,
  "etonline.com": 14,
  "cbsnews.com": 20,
  "news.sky.com": 18,
  "sky.com": 18,
  "latimes.com": 19,
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
  category: Category;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  imageUrl?: string;
}

export interface StoryCluster {
  category: Category;
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

/** Celebrity / pop-culture signals (K-pop, J-pop, Hollywood, TW/HK/CN idols). */
const ENTERTAINMENT_POSITIVE = [
  "k-pop", "kpop", "j-pop", "jpop", "blackpink", "bts", "twice", "stray kids",
  "aespa", "newjeans", "seventeen", "exo", "nct", "ive", "itzy", "black pink",
  "jennie", "rosé", "jisoo", "jungkook", "taylor swift", "beyoncé",
  "beyonce", "lady gaga", "drake", "rihanna", "ariana grande", "billie eilish",
  "hollywood", "celebrity", "celebrities", "celeb", "k-pop idol", "idol group",
  "new album", "debut album", "grammy", "oscars", "emmys", "emmy awards",
  "red carpet", "paparazzi", "box office", "comeback stage",
  "music video", "billboard hot", "concert tour", "world tour",
  "welcomes baby", "baby with", "showbiz", "gossip", "tmz",
  "pop star", "pop singer", "rapper", "actress", "movie star",
  "le sserafim", "riize", "enhypen", "ateez", "g-dragon",
  "jay chou", "jj lin", "tfboys", "xiao zhan", "wang yibo",
  "akb48", "hikaru utada", "yoasobi", "soompi", "koreaboo",
  "sydney sweeney", "hayden panettiere", "walking dead", "netflix series",
  "charli xcx", "my chemical romance", "gerard way", "carrie underwood",
  "jeongyeon", "yunjin", "jungkook", "diljit dosanjh",
];

/** Wrong-direction entertainment: festivals academia, Broadway reviews, ferry misc. */
const ENTERTAINMENT_NEGATIVE = [
  "broadway review", "off-broadway", "film festival lineup", "film festival unveils",
  "student academy", "documentary film festival", "visions forum", "tiff debut",
  "ciudad de la luz", "ferry", "academic", "lifetime achievement award ceremony lineup",
  "grand prix at deauville", "production at", "developing debut feature",
  "posts fresh deals for", "industry remember legendary",
];

/** Society / civic incident signals. */
const SOCIETY_POSITIVE = [
  "murder", "killed", "killing", "stabbed", "shooting", "shot dead", "homicide",
  "arrested", "arrest", "suspect", "crime", "robbery", "assault", "rape",
  "car crash", "crash", "collision", "accident", "fatal", "died in",
  "earthquake", "flood", "wildfire", "typhoon", "hurricane", "disaster",
  "explosion", "fire engulfs", "building collapse", "mass shooting",
  "police", "jailed", "sentenced", "court hears", "missing person",
  "public safety", "evacuation", "landslide", "train derail", "bus crash",
  "hit-and-run", "domestic violence", "scam targeting", "extradited",
  "speedboat killer", "holdout juror", "found hanging", "deported",
  "minibike", "mclaren crash",
];

/** Geopolitics / finance that should NOT stay in society. */
const SOCIETY_NEGATIVE = [
  "nato", "ukraine war", "ceasefire talks", "stock market", "interest rate",
  "federal reserve", "inflation data", "gdp ", "election poll", "parliament vote",
  "crypto donations", "party donations", "human rights ai", "geopolitics",
];

function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Phrase / token boundary match (avoid "actor" in "factor", "rose" in "arose")
    const re = new RegExp(
      `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,
      "i"
    );
    return re.test(hay);
  });
}

/**
 * Retune category from feed default using title/snippet heuristics.
 * Returns null if the item should be dropped (wrong-direction entertainment).
 */
export function resolveCategory(
  feedCategory: Category,
  title: string,
  description: string
): Category | null {
  const text = `${title} ${description}`.toLowerCase();

  // Drop clear non-celeb industry/festival noise from entertainment feeds
  if (
    feedCategory === "entertainment" &&
    includesAny(text, ENTERTAINMENT_NEGATIVE) &&
    !includesAny(text, ENTERTAINMENT_POSITIVE)
  ) {
    return null;
  }

  // Keep entertainment-feed items as entertainment (already filtered negatives)
  if (feedCategory === "entertainment") {
    return "entertainment";
  }

  // Strong celebrity signals from other feeds → entertainment
  if (includesAny(text, ENTERTAINMENT_POSITIVE)) {
    if (feedCategory === "finance" || feedCategory === "tech" || feedCategory === "ai") {
      return feedCategory; // don't steal product/market news
    }
    return "entertainment";
  }

  // Society feeds are mixed (UK politics + crime). Keep only incident-like items.
  if (feedCategory === "society") {
    if (includesAny(text, SOCIETY_POSITIVE)) {
      return "society";
    }
    // AI policy, parliament, macro politics → international (or finance if money)
    if (
      /\b(ai|artificial intelligence|mps?|lords|parliament|election|minister|gdp|inflation|interest rate)\b/i.test(
        text
      )
    ) {
      return "international";
    }
    // soft keep if crime-adjacent verbs, else international
    if (
      /\b(kill|killed|jailed|arrest|crash|murder|assault|stab|shoot|disaster|flood|fire|missing)\b/i.test(
        text
      )
    ) {
      return "society";
    }
    return "international";
  }

  if (
    feedCategory === "international" &&
    includesAny(text, SOCIETY_POSITIVE) &&
    !includesAny(text, SOCIETY_NEGATIVE)
  ) {
    return "society";
  }

  return feedCategory;
}

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
        category: category as Category,
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
  "emmy",
  "super bowl",
  "viral",
  "k-pop",
  "blackpink",
  "bts",
  "lady gaga",
  "taylor swift",
  "murder",
  "arrested",
  "shooting",
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
  const highRepCats: Category[] = ["international", "finance", "tech", "ai", "society"];
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
  targetMax = 26
): StoryCluster[] {
  const perCatTarget: Record<string, number> = {
    international: 3,
    finance: 3,
    tech: 3,
    ai: 2,
    entertainment: 5,
    society: 4,
    beauty: 2,
  };

  const CELEB_DOMAINS = new Set([
    "billboard.com",
    "rollingstone.com",
    "soompi.com",
    "koreaboo.com",
    "tmz.com",
    "hollywoodlife.com",
    "justjared.com",
    "etonline.com",
  ]);

  const scored = clusters.map((c) => {
    const tb = buildTrustBreakdown(c);
    let score =
      computeTrustScore(tb) +
      (c.members.length - 1) * 8 +
      (Date.parse(c.publishedAt) || 0) / 1e12;
    // Prefer true celebrity/pop outlets inside entertainment
    if (c.category === "entertainment") {
      const domains = c.members.map((m) =>
        m.domain.replace(/^www\./, "").toLowerCase()
      );
      const celebHit = domains.some((d) => CELEB_DOMAINS.has(d));
      if (celebHit) score += 18;
      // Extra boost for Asia pop / celebrity gossip outlets
      if (domains.some((d) => d === "soompi.com" || d === "koreaboo.com")) {
        score += 22;
      }
      if (domains.some((d) => d === "billboard.com" || d === "rollingstone.com" || d === "tmz.com")) {
        score += 8;
      }
      // Soft-penalize BBC arts sports / kids toy / non-celeb misc
      const t = c.primaryTitle.toLowerCase();
      if (/sport|betting advert|ferry|deport|dollhouse|blind box/.test(t)) score -= 14;
    }
    // Prefer clear crime/accident society clusters
    if (c.category === "society") {
      const t = `${c.primaryTitle}`.toLowerCase();
      if (
        /murder|kill|arrest|crash|shoot|stab|crime|disaster|flood|earthquake|fire|jailed|suspect/.test(
          t
        )
      ) {
        score += 12;
      }
      if (/school dinner|crypto donations|party donations|human rights ai/.test(t)) {
        score -= 10;
      }
    }
    return { c, score, tb };
  });

  scored.sort((a, b) => b.score - a.score);

  const picked: StoryCluster[] = [];
  const counts: Record<string, number> = {};

  const entDomains = new Set<string>();
  for (const { c } of scored) {
    const n = counts[c.category] ?? 0;
    if (n >= (perCatTarget[c.category] ?? 3)) continue;
    if (c.category === "entertainment") {
      const dom = c.members[0]?.domain.replace(/^www\./, "").toLowerCase() ?? "";
      // Prefer outlet diversity so K-pop (Soompi/Koreaboo) isn't crowded out
      if (entDomains.has(dom) && entDomains.size < 4 && n >= 1) continue;
      if (dom) entDomains.add(dom);
    }
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
