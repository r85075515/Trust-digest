/**
 * TW heat-discovery MVP (lightweight, no heavy auth).
 *
 * Shipped:
 *  - PTT Gossiping (Cookie over18=1) — top titles
 *  - Dcard via GNews proxy site:dcard.tw 娛樂 (direct dcard.tw is CF 403)
 *  - LINE TODAY TW entertainment HTML titles (+ optional GNews site:today.line.me)
 *
 * Backlog (do NOT implement here): Threads, X/Twitter, native Dcard API,
 * full LINE TODAY tab crawl, more PTT boards.
 *
 * Flow: heat titles → verify against TW news RSS (ETtoday / Yahoo / GNews colony).
 * ≥2 independent news domains → elevated trust eligible; forum-only → 審慎 / never high trust.
 */

import type { EastAsiaRegion, Category } from "./types";
import type { RawFeedItem } from "./rss-ingest";
import { USER_AGENT, stripHtml } from "./rss-ingest";

export type HeatSourceId = "ptt" | "gnews-dcard" | "line-today";

export interface HeatCandidate {
  title: string;
  source: HeatSourceId;
  url?: string;
  board?: string;
}

const FETCH_MS = 10_000;

const GOSSIP_HEAT_RE =
  /分手|婚變|復合|離婚|緋聞|網紅|藝人|影劇|直播|對質|明星|歐巴|韓星|台星|戀愛|出軌|舊愛|前女友|前男友|認愛|閃婚|鬧分手/;

/** Strip PTT category tags like [新聞]/[問卦] for keyword matching. */
export function cleanHeatTitle(title: string): string {
  return title
    .replace(/^Re:\s*/i, "")
    .replace(/^\[[^\]]+\]\s*/g, "")
    .replace(/^\[[^\]]+\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract short CJK / Latin query tokens from a heat title for news verify. */
export function heatQueryTokens(title: string): string[] {
  const cleaned = cleanHeatTitle(title);
  const tokens: string[] = [];
  // Prefer 2–4 char CJK runs (names / topics)
  for (const m of cleaned.matchAll(/[\u4e00-\u9fff]{2,6}/g)) {
    const t = m[0];
    if (/^[的了是在有與和及被把就都也很不無再讓給]/.test(t) && t.length <= 2) continue;
    tokens.push(t);
  }
  // Latin words (rare in TW gossip)
  for (const m of cleaned.toLowerCase().matchAll(/[a-z][a-z0-9-]{2,}/g)) {
    tokens.push(m[0]);
  }
  // Dedup keep order, prefer longer
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens.sort((a, b) => b.length - a.length)) {
    if (seen.has(t)) continue;
    // skip generic
    if (["新聞", "問卦", "爆卦", "討論", "分享", "直播", "對質", "公開"].includes(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}

async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml,application/rss+xml,*/*",
        ...headers,
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`[heat] HTTP ${res.status} ${url.slice(0, 80)}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn(`[heat] fetch fail ${url.slice(0, 60)}:`, (e as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 1) PTT Gossiping index — Cookie over18=1 */
export async function scrapePttGossiping(limit = 25): Promise<HeatCandidate[]> {
  const html = await fetchText("https://www.ptt.cc/bbs/Gossiping/index.html", {
    Cookie: "over18=1",
  });
  if (!html) return [];
  const out: HeatCandidate[] = [];
  const re =
    /<div class="title">\s*<a href="(\/bbs\/Gossiping\/[^"]+)">([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const title = m[2].trim();
    if (!title || title.includes("公告")) continue;
    out.push({
      title,
      source: "ptt",
      url: `https://www.ptt.cc${m[1]}`,
      board: "Gossiping",
    });
    if (out.length >= limit) break;
  }
  console.info(`[heat] PTT Gossiping titles: ${out.length}`);
  return out;
}

/** 2) Dcard heat via GNews proxy (direct dcard.tw is CF 403 — do not scrape). */
export async function scrapeGnewsDcardProxy(limit = 15): Promise<HeatCandidate[]> {
  const url =
    "https://news.google.com/rss/search?q=site:dcard.tw+%E5%A8%9B%E6%A8%82&hl=zh-TW&gl=TW&ceid=TW:zh-Hant";
  const xml = await fetchText(url);
  if (!xml) return [];
  const out: HeatCandidate[] = [];
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const item of items) {
    const tm = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>([^<]+)<\/title>/);
    const title = (tm?.[1] || tm?.[2] || "").replace(/\s+-\s+.*$/, "").trim();
    const lm = item.match(/<link>([^<]+)<\/link>/);
    if (!title || title.includes("Google 新聞")) continue;
    // Skip pure corporate Dcard marketing
    if (/Dcard 公司|Dcard Ads|富比士|執行長|求職板/.test(title) && !GOSSIP_HEAT_RE.test(title)) {
      continue;
    }
    out.push({
      title,
      source: "gnews-dcard",
      url: lm?.[1]?.trim(),
      board: "dcard-proxy",
    });
    if (out.length >= limit) break;
  }
  console.info(`[heat] GNews-Dcard proxy titles: ${out.length}`);
  return out;
}

/** 3) LINE TODAY TW entertainment HTML — titles from __NEXT_DATA__ / visible text. */
export async function scrapeLineTodayEntertainment(limit = 20): Promise<HeatCandidate[]> {
  const html = await fetchText("https://today.line.me/tw/v2/tab/entertainment");
  if (!html) return [];
  const out: HeatCandidate[] = [];
  const seen = new Set<string>();

  const push = (title: string, url?: string) => {
    const t = title.trim();
    if (!t || t.length < 8 || seen.has(t)) return;
    if (/AD-|LIFF|Poll|Banner|Quiz|投票|LINE投|策展|Headline|焦點/.test(t)) return;
    seen.add(t);
    out.push({ title: t, source: "line-today", url, board: "entertainment" });
  };

  const next = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (next) {
    try {
      const data = JSON.parse(next[1]) as unknown;
      const walk = (o: unknown) => {
        if (!o || out.length >= limit) return;
        if (Array.isArray(o)) {
          for (const v of o) walk(v);
          return;
        }
        if (typeof o === "object") {
          const obj = o as Record<string, unknown>;
          const t = obj.title ?? obj.headline;
          if (typeof t === "string" && t.length >= 8) {
            const u =
              typeof obj.url === "string"
                ? obj.url
                : typeof obj.shareUrl === "string"
                  ? obj.shareUrl
                  : undefined;
            push(t, u);
          }
          for (const v of Object.values(obj)) walk(v);
        }
      };
      walk(data);
    } catch {
      /* ignore parse errors */
    }
  }

  // Fallback: GNews site:today.line.me if HTML yielded little gossip signal
  if (out.filter((c) => GOSSIP_HEAT_RE.test(c.title)).length < 3) {
    const xml = await fetchText(
      "https://news.google.com/rss/search?q=site:today.line.me/tw+%E5%A8%9B%E6%A8%82&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
    );
    if (xml) {
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
      for (const item of items) {
        const tm = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>([^<]+)<\/title>/);
        const title = (tm?.[1] || tm?.[2] || "").replace(/\s+\|\s+.*$/, "").replace(/\s+-\s+.*$/, "").trim();
        const lm = item.match(/<link>([^<]+)<\/link>/);
        if (title && !title.includes("Google 新聞")) push(title, lm?.[1]?.trim());
        if (out.length >= limit) break;
      }
    }
  }

  console.info(`[heat] LINE TODAY titles: ${out.length}`);
  return out.slice(0, limit);
}

export async function discoverTwHeat(): Promise<HeatCandidate[]> {
  const [ptt, dcard, line] = await Promise.all([
    scrapePttGossiping(25),
    scrapeGnewsDcardProxy(12),
    scrapeLineTodayEntertainment(20),
  ]);
  const all = [...ptt, ...dcard, ...line];
  // Prefer gossip-flavoured titles first
  all.sort((a, b) => {
    const sa = GOSSIP_HEAT_RE.test(a.title) ? 1 : 0;
    const sb = GOSSIP_HEAT_RE.test(b.title) ? 1 : 0;
    return sb - sa;
  });
  console.info(
    `[heat] total candidates: ${all.length} (ptt=${ptt.length}, gnews-dcard=${dcard.length}, line=${line.length})`
  );
  return all;
}

export interface HeatVerifyResult {
  /** News items matched to heat (for merge into ingest pool). */
  newsItems: RawFeedItem[];
  /** Heat keywords that found ≥2 news domains. */
  verifiedKeywords: string[];
  /** Heat titles with no/weak news corroboration (forum-only → 審慎). */
  unverifiedHeat: HeatCandidate[];
  sourcesShipped: HeatSourceId[];
}

function domainFromLink(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Map publisher host from Google News redirect / title suffix. */
function publisherDomain(link: string, title: string): string {
  const d = domainFromLink(link);
  if (d && d !== "news.google.com") return d;
  // "Story title - Outlet" pattern
  const m = title.match(/\s[-–|]\s*([^-–|]{2,40})$/);
  if (m) {
    const outlet = m[1].trim().toLowerCase();
    if (outlet.includes("ettoday")) return "ettoday.net";
    if (outlet.includes("yahoo")) return "tw.news.yahoo.com";
    if (outlet.includes("三立") || outlet.includes("setn")) return "setn.com";
    if (outlet.includes("鏡週刊") || outlet.includes("mirrormedia")) return "mirrormedia.mg";
    if (outlet.includes("自由")) return "ltn.com.tw";
    if (outlet.includes("聯合") || outlet.includes("udn")) return "udn.com";
    if (outlet.includes("中時")) return "chinatimes.com";
    if (outlet.includes("東森") || outlet.includes("ebc")) return "news.ebc.net.tw";
    if (outlet.includes("line today") || outlet.includes("line")) return "today.line.me";
    return outlet.replace(/\s+/g, "");
  }
  return d || "news.google.com";
}

/**
 * Verify heat against colony TW news RSS already fetched + targeted GNews queries.
 * Returns news RawFeedItems tagged region=tw for clustering/merge.
 */
export async function verifyHeatAgainstNews(
  heat: HeatCandidate[],
  existingItems: RawFeedItem[],
  opts: { maxQueries?: number } = {}
): Promise<HeatVerifyResult> {
  const maxQueries = opts.maxQueries ?? 4;
  const sourcesShipped: HeatSourceId[] = [];
  if (heat.some((h) => h.source === "ptt")) sourcesShipped.push("ptt");
  if (heat.some((h) => h.source === "gnews-dcard")) sourcesShipped.push("gnews-dcard");
  if (heat.some((h) => h.source === "line-today")) sourcesShipped.push("line-today");

  const gossipHeat = heat.filter(
    (h) => GOSSIP_HEAT_RE.test(h.title) || h.source !== "ptt"
  );
  // Build keyword list from top gossip heat
  const keywordScores = new Map<string, number>();
  for (const h of gossipHeat.slice(0, 40)) {
    const toks = heatQueryTokens(h.title);
    // Prefer multi-char name-like tokens
    for (const t of toks.slice(0, 3)) {
      keywordScores.set(t, (keywordScores.get(t) ?? 0) + (GOSSIP_HEAT_RE.test(h.title) ? 3 : 1));
    }
    // Whole cleaned title if short
    const cleaned = cleanHeatTitle(h.title);
    if (cleaned.length >= 4 && cleaned.length <= 16) {
      keywordScores.set(cleaned, (keywordScores.get(cleaned) ?? 0) + 2);
    }
  }
  const keywords = [...keywordScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .slice(0, maxQueries);

  const newsItems: RawFeedItem[] = [];
  const verifiedKeywords: string[] = [];
  const seenLinks = new Set(existingItems.map((i) => i.link));

  // Match existing colony items against heat keywords first (no extra tokens)
  for (const kw of keywords) {
    const hits = existingItems.filter(
      (it) =>
        it.region === "tw" &&
        it.category === "eastAsiaGossip" &&
        it.title.includes(kw)
    );
    const domains = new Set(hits.map((h) => h.domain.replace(/^www\./, "")));
    if (domains.size >= 2 || hits.length >= 2) {
      verifiedKeywords.push(kw);
    }
  }

  // Targeted GNews verify queries for top keywords not yet verified
  for (const kw of keywords) {
    if (verifiedKeywords.includes(kw) && newsItems.length >= 8) continue;
    const q = encodeURIComponent(kw);
    const url = `https://news.google.com/rss/search?q=${q}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
    const xml = await fetchText(url);
    if (!xml) continue;
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const batch: RawFeedItem[] = [];
    const domains = new Set<string>();
    for (const item of items.slice(0, 12)) {
      const tm = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>([^<]+)<\/title>/);
      const rawTitle = (tm?.[1] || tm?.[2] || "").trim();
      if (!rawTitle || rawTitle.includes("Google 新聞")) continue;
      const lm = item.match(/<link>([^<]+)<\/link>/);
      const link = (lm?.[1] || "").trim();
      if (!link || seenLinks.has(link)) continue;
      const dm = item.match(/<pubDate>([^<]+)<\/pubDate>/);
      const domain = publisherDomain(link, rawTitle);
      const title = rawTitle.replace(/\s+-\s+[^-]+$/, "").trim();
      const descMatch = item.match(
        /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>([^<]*)<\/description>/
      );
      const description = stripHtml(descMatch?.[1] || descMatch?.[2] || "").slice(0, 2000);
      const row: RawFeedItem = {
        feedId: `heat-verify-${kw.slice(0, 12)}`,
        outletName: `GNews TW heat:${kw.slice(0, 16)}`,
        domain,
        category: "eastAsiaGossip" as Category,
        title,
        link,
        pubDate: dm?.[1] ? new Date(dm[1]).toISOString() : new Date().toISOString(),
        description,
        region: "tw" as EastAsiaRegion,
      };
      batch.push(row);
      domains.add(domain);
      seenLinks.add(link);
    }
    if (domains.size >= 2 || batch.length >= 3) {
      if (!verifiedKeywords.includes(kw)) verifiedKeywords.push(kw);
      newsItems.push(...batch);
    } else if (batch.length >= 1) {
      // Single-outlet news: still ingest but trust layer will cap rumor/single
      newsItems.push(...batch);
    }
  }

  const unverifiedHeat = gossipHeat.filter((h) => {
    const toks = heatQueryTokens(h.title);
    return !toks.some((t) => verifiedKeywords.some((v) => v.includes(t) || t.includes(v)));
  });

  console.info(
    `[heat] verified keywords: ${verifiedKeywords.join(", ") || "(none)"} | news inject: ${newsItems.length} | unverified heat: ${unverifiedHeat.length}`
  );

  return { newsItems, verifiedKeywords, unverifiedHeat, sourcesShipped };
}

/** Boost flag: cluster title matches a verified heat keyword. */
export function heatBoostScore(title: string, verifiedKeywords: string[]): number {
  if (!verifiedKeywords.length) return 0;
  let boost = 0;
  for (const kw of verifiedKeywords) {
    if (title.includes(kw)) boost += 10;
  }
  if (GOSSIP_HEAT_RE.test(title)) boost += 4;
  return Math.min(boost, 28);
}
