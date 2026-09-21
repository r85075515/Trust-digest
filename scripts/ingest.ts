/**
 * Axiom live news ingest — allow-listed RSS only.
 * Usage: npm run ingest
 *
 * Env (optional LLM):
 *   AXIOM_LLM_API_KEY | OPENAI_API_KEY | XAI_API_KEY
 *   AXIOM_LLM_BASE_URL (default OpenAI-compatible)
 *   AXIOM_LLM_MODEL
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import {
  ALLOWED_FEEDS,
  USER_AGENT,
  clusterItems,
  buildTrustBreakdown,
  buildExtractiveDigest,
  isPopularCluster,
  isHeadlineCandidate,
  pickBalancedClusters,
  resolveCategory,
  stripHtml,
  extractFirstImg,
  domainFromUrl,
  slugify,
  type RawFeedItem,
  type StoryCluster,
  type FeedSource,
} from "../src/lib/rss-ingest";
import {
  discoverTwHeat,
  verifyHeatAgainstNews,
} from "../src/lib/heat-discovery";
import {
  computeTrustScore,
  applyTrustCaps,
  isDevelopingCasualtyText,
  isDevelopingGossipText,
} from "../src/lib/trust";
import type { Story, LocalizedText } from "../src/lib/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_STORIES = path.join(ROOT, "data", "stories.json");
const OUT_META = path.join(ROOT, "data", "ingest-meta.json");
const COVER_DIR = path.join(ROOT, "public", "covers", "live");

const FETCH_TIMEOUT_MS = 12_000;
const OG_TIMEOUT_MS = 5_000;
const FEED_DELAY_MS = 400;
/** Default cap — overridden per feed for TW heat vs jp/kr/cn soft-deprioritize. */
const MAX_ITEMS_PER_FEED_DEFAULT = 7;

/** Per-feed item caps (token-saving): TW EA 20–25; jp/kr/cn 5–6; other cats 6–8. */
function maxItemsForFeed(source: FeedSource): number {
  if (source.category === "eastAsiaGossip") {
    if (source.region === "tw") return 22;
    if (source.region === "jp" || source.region === "kr" || source.region === "cn") {
      return 5;
    }
  }
  return MAX_ITEMS_PER_FEED_DEFAULT;
}

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Strip raw http(s) URLs from LLM/extractive text (links live in sources[]). */
function stripRawUrls(text: string): string {
  return text
    .replace(/https?:\/\/[^\s)\]>\"']+/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/ \n/g, "\n")
    .trim();
}

function loadKeyFromBoxSecrets(): string {
  try {
    const p = "/home/box/agent-data/box-secrets.json";
    if (!fs.existsSync(p)) return "";
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as {
      card?: Record<string, string>;
    };
    return data.card?.AXIOM_LLM_API_KEY || data.card?.XAI_API_KEY || "";
  } catch {
    return "";
  }
}

function getLlmConfig(): {
  key: string;
  baseUrl: string;
  model: string;
} | null {
  const key =
    process.env.AXIOM_LLM_API_KEY ||
    process.env.XAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    loadKeyFromBoxSecrets() ||
    "";
  if (!key) return null;

  const isXai =
    key.startsWith("xai-") ||
    Boolean(process.env.AXIOM_LLM_API_KEY) ||
    Boolean(process.env.XAI_API_KEY) ||
    (process.env.AXIOM_LLM_BASE_URL || "").includes("x.ai");

  let baseUrl =
    process.env.AXIOM_LLM_BASE_URL ||
    (isXai ? "https://api.x.ai/v1" : "https://api.openai.com/v1");
  baseUrl = baseUrl.replace(/\/$/, "");

  const model =
    process.env.AXIOM_LLM_MODEL ||
    (baseUrl.includes("x.ai") ? "grok-3-mini" : "gpt-4o-mini");

  // Never log the key — length only
  console.info(`[ingest] LLM key loaded (len=${key.length}, xai=${baseUrl.includes("x.ai")})`);

  return { key, baseUrl, model };
}

async function fetchFeed(source: FeedSource): Promise<RawFeedItem[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`[ingest] ${source.id} HTTP ${res.status} — skipping`);
      return [];
    }
    const xml = await res.text();
    const feed = await parser.parseString(xml);
    const items: RawFeedItem[] = [];

    const itemCap = maxItemsForFeed(source);
    for (const item of (feed.items ?? []).slice(0, itemCap)) {
      const title = (item.title ?? "").trim();
      const link = (item.link ?? item.guid ?? "").toString().trim();
      if (!title || !link || !/^https?:\/\//i.test(link)) continue;

      const description = stripHtml(
        (item.contentEncoded as string) ||
          item.content ||
          item.contentSnippet ||
          item.summary ||
          ""
      );

      let imageUrl = pickItemImage(item);
      if (!imageUrl && item.content) {
        imageUrl = extractFirstImg(item.content);
      }
      if (!imageUrl && item.contentEncoded) {
        imageUrl = extractFirstImg(item.contentEncoded as string);
      }

      const category = resolveCategory(
        source.category,
        title,
        description.slice(0, 2000)
      );
      if (!category) continue; // drop wrong-direction entertainment noise

      items.push({
        feedId: source.id,
        outletName: source.name,
        domain: source.domain || domainFromUrl(link),
        category,
        title,
        link,
        pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
        description: description.slice(0, 2000),
        region: source.region,
        imageUrl: imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : undefined,
      });
    }
    console.info(`[ingest] ${source.id}: ${items.length} items`);
    return items;
  } catch (err) {
    console.warn(
      `[ingest] ${source.id} failed:`,
      err instanceof Error ? err.message : err
    );
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function pickItemImage(item: Parser.Item & Record<string, any>): string | undefined {
  const enclosure = item.enclosure;
  if (enclosure?.url && /image|jpeg|jpg|png|webp|gif/i.test(enclosure.type || enclosure.url)) {
    return enclosure.url;
  }

  const mediaContent = item.mediaContent as
    | Array<{ $?: { url?: string; medium?: string; type?: string } } | string>
    | undefined;
  if (Array.isArray(mediaContent)) {
    for (const m of mediaContent) {
      if (typeof m === "string" && /^https?:/.test(m)) return m;
      if (m && typeof m === "object" && m.$?.url) return m.$.url;
    }
  }

  const mediaThumb = item.mediaThumbnail as
    | Array<{ $?: { url?: string } }>
    | undefined;
  if (Array.isArray(mediaThumb)) {
    for (const m of mediaThumb) {
      if (m?.$?.url) return m.$.url;
    }
  }

  return undefined;
}

async function fetchOgImage(articleUrl: string): Promise<string | undefined> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OG_TIMEOUT_MS);
  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return undefined;
    const html = await res.text();
    const og =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
      );
    const url = og?.[1];
    if (url && /^https?:\/\//i.test(url)) return url;
    return undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadCover(
  imageUrl: string,
  storyId: string
): Promise<string | undefined> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return undefined;
    const ctype = res.headers.get("content-type") || "";
    if (!/image\//i.test(ctype) && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(imageUrl)) {
      return undefined;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500 || buf.length > 2_500_000) return undefined;

    let ext = "jpg";
    if (/png/i.test(ctype) || imageUrl.includes(".png")) ext = "png";
    else if (/webp/i.test(ctype) || imageUrl.includes(".webp")) ext = "webp";
    else if (/gif/i.test(ctype)) ext = "gif";

    fs.mkdirSync(COVER_DIR, { recursive: true });
    const filename = `${storyId}.${ext}`;
    fs.writeFileSync(path.join(COVER_DIR, filename), buf);
    return `/covers/live/${filename}`;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function translateToZhTW(text: string): Promise<string | null> {
  try {
    const { translate } = await import("@vitalets/google-translate-api");
    // Chunk long text
    const chunks: string[] = [];
    const parts = text.split(/\n\n+/);
    let buf = "";
    for (const p of parts) {
      if ((buf + "\n\n" + p).length > 3500) {
        if (buf) chunks.push(buf);
        buf = p;
      } else {
        buf = buf ? buf + "\n\n" + p : p;
      }
    }
    if (buf) chunks.push(buf);

    const out: string[] = [];
    for (const c of chunks) {
      const r = await translate(c, { to: "zh-TW" });
      out.push(r.text);
      await sleep(250);
    }
    return out.join("\n\n");
  } catch (err) {
    console.warn(
      "[ingest] translate failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function llmDigest(
  cluster: StoryCluster,
  cfg: { key: string; baseUrl: string; model: string }
): Promise<{
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  bodyEn: string;
  bodyZh: string;
  disagreementsEn: string | null;
  disagreementsZh: string | null;
  glossary: Array<{
    termEn: string;
    termZh: string;
    blurbEn: string;
    blurbZh: string;
  }>;
} | null> {
  const sourcesBlock = cluster.members
    .map(
      (m) =>
        `- ${m.outletName}: ${m.title}\n  URL: ${m.link}\n  Snippet: ${m.description.slice(0, 500)}`
    )
    .join("\n");

  const prompt = `You are Axiom's news digest writer. Create a bilingual digest from ONLY the source titles and snippets below. NEVER invent facts, quotes, numbers, or events not present in the sources. Summarize + link only.

Category: ${cluster.category}
Primary title hint: ${cluster.primaryTitle}
Category guidance: entertainment = Western/global hot verifiable celebrity gossip (標驗證／多源 — Hollywood, Billboard, TMZ-style) — NOT Broadway reviews, film-festival academia, or industry deal roundups. eastAsiaGossip = TW/JP/KR/CN celebrity & entertainment gossip (影劇、芸能、연예、娱乐圈) — keep SEPARATE from entertainment; do not mix lanes. Hard news (crime/disaster) belongs in international/finance/tech/ai — not gossip lanes. Developing/unverified gossip (allegedly, rumor, 緋聞未證實、傳、爆料未證實) must stay cautious — never imply multi-source high trust from a single rumor outlet.

SOURCES:
${sourcesBlock}

Return STRICT JSON with keys:
title_en, title_zh_TW, summary_en, summary_zh_TW, body_en, body_zh_TW, disagreements_en (string or null), disagreements_zh_TW (string or null), glossary (array)

Rules:
- Titles MUST lead with concrete proper nouns (people, orgs, places, products).
- summary_* = short card briefing (~40-60 words en / similar zh).
- body_* = full digest with sections: lede, What happened, Why it matters, Sources agree/disagree, Still uncertain. ~200+ words en; Traditional Chinese for zh.
- NEVER include raw http(s) URLs in title_*, summary_*, or body_* — cite outlet names only (links are attached separately).
- If sources conflict on numbers/names, put that in disagreements_*; else null.
- Use Traditional Chinese (Taiwan) for zh fields. Minimize EN/ZH mixing in zh-TW prose — keep sentences in Chinese; use 譯名（Original） ONLY for people/org/product/place names, not for ordinary words.
- CRITICAL for ALL zh-TW fields (title_zh_TW, summary_zh_TW, body_zh_TW): when mentioning people, orgs, products, or places that have a known Latin/English original name from the sources, format as 譯名（Original Latin Name） e.g. 山姆·奧特曼（Sam Altman）. NEVER use bare Chinese transliteration alone. English fields stay natural English (no reverse format needed).
- glossary: array of 3–8 objects { term_en, term_zh_TW, blurb_en, blurb_zh_TW } for key people/orgs/proper nouns in the story. Each blurb = one short factual sentence (identity/role only — CEO of X, agency, product — NO invented biography beyond what sources imply or widely known identity). term_zh_TW must also use 譯名（Original） when applicable. If nothing needs explaining, use [].`;

  try {
    const messages = [
      { role: "system", content: "You output only valid JSON. Never invent news facts." },
      { role: "user", content: prompt },
    ];
    async function callLlm(withJsonFormat: boolean) {
      const body: Record<string, unknown> = {
        model: cfg.model,
        temperature: 0.2,
        messages,
      };
      if (withJsonFormat) body.response_format = { type: "json_object" };
      return fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    }
    let res = await callLlm(true);
    if (!res.ok) {
      const errText = await res.text().then((t) => t.slice(0, 200));
      console.warn("[ingest] LLM HTTP", res.status, errText.replace(/xai-[A-Za-z0-9_-]+/g, "[REDACTED]"));
      if (res.status === 400 || /response_format|json_object/i.test(errText)) {
        res = await callLlm(false);
      } else {
        return null;
      }
    }
    if (!res.ok) {
      console.warn("[ingest] LLM retry HTTP", res.status, await res.text().then((t) => t.slice(0, 200).replace(/xai-[A-Za-z0-9_-]+/g, "[REDACTED]")));
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const rawGlossary = Array.isArray(parsed.glossary) ? parsed.glossary : [];
    const glossary = rawGlossary
      .map((g) => {
        if (!g || typeof g !== "object") return null;
        const o = g as Record<string, unknown>;
        const termEn = String(o.term_en || "").trim();
        const termZh = String(o.term_zh_TW || o.term_zh || "").trim();
        const blurbEn = String(o.blurb_en || "").trim();
        const blurbZh = String(o.blurb_zh_TW || o.blurb_zh || "").trim();
        if (!termEn && !termZh) return null;
        if (!blurbEn && !blurbZh) return null;
        return {
          termEn: termEn || termZh,
          termZh: termZh || termEn,
          blurbEn: blurbEn || blurbZh,
          blurbZh: blurbZh || blurbEn,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .slice(0, 8);
    return {
      titleEn: stripRawUrls(String(parsed.title_en || cluster.primaryTitle)),
      titleZh: stripRawUrls(String(parsed.title_zh_TW || parsed.title_zh || "")),
      summaryEn: stripRawUrls(String(parsed.summary_en || "")),
      summaryZh: stripRawUrls(String(parsed.summary_zh_TW || parsed.summary_zh || "")),
      bodyEn: stripRawUrls(String(parsed.body_en || "")),
      bodyZh: stripRawUrls(String(parsed.body_zh_TW || parsed.body_zh || "")),
      disagreementsEn: parsed.disagreements_en
        ? stripRawUrls(String(parsed.disagreements_en))
        : null,
      disagreementsZh: parsed.disagreements_zh_TW
        ? stripRawUrls(String(parsed.disagreements_zh_TW))
        : parsed.disagreements_zh
          ? stripRawUrls(String(parsed.disagreements_zh))
          : null,
      glossary,
    };
  } catch (err) {
    console.warn("[ingest] LLM failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function localizeCluster(
  cluster: StoryCluster,
  llm: ReturnType<typeof getLlmConfig>
): Promise<{
  title: LocalizedText;
  summary: LocalizedText;
  body: LocalizedText;
  disagreements: LocalizedText | null;
  glossary: Array<{ term: LocalizedText; blurb: LocalizedText }>;
}> {
  if (llm) {
    const d = await llmDigest(cluster, llm);
    if (d && d.summaryEn && d.bodyEn) {
      const titleZh =
        d.titleZh ||
        (await translateToZhTW(d.titleEn)) ||
        `（譯文待補）${d.titleEn}`;
      const summaryZh =
        d.summaryZh ||
        (await translateToZhTW(d.summaryEn)) ||
        `（譯文待補）${d.summaryEn}`;
      const bodyZh =
        d.bodyZh ||
        (await translateToZhTW(d.bodyEn)) ||
        `（譯文待補／translation pending）\n\n${d.bodyEn}`;
      let disagreements: LocalizedText | null = null;
      if (d.disagreementsEn || cluster.disagreementHint) {
        const en = d.disagreementsEn || cluster.disagreementHint || "";
        const zh =
          d.disagreementsZh ||
          (await translateToZhTW(en)) ||
          `（譯文待補）${en}`;
        disagreements = { en, "zh-TW": zh };
      }
      const glossary = (d.glossary || []).map((g) => ({
        term: { en: g.termEn, "zh-TW": g.termZh },
        blurb: { en: g.blurbEn, "zh-TW": g.blurbZh },
      }));
      return {
        title: { en: stripRawUrls(d.titleEn), "zh-TW": stripRawUrls(titleZh) },
        summary: {
          en: stripRawUrls(d.summaryEn),
          "zh-TW": stripRawUrls(summaryZh),
        },
        body: { en: stripRawUrls(d.bodyEn), "zh-TW": stripRawUrls(bodyZh) },
        disagreements,
        glossary,
      };
    }
  }

  const { summaryEn, bodyEn } = buildExtractiveDigest(cluster);
  const titleEn = cluster.primaryTitle;

  const titleZh =
    (await translateToZhTW(titleEn)) || `（譯文待補）${titleEn}`;
  const summaryZh =
    (await translateToZhTW(summaryEn)) ||
    `（中文譯文待補／translation pending） ${summaryEn}`;
  const bodyZh =
    (await translateToZhTW(bodyEn)) ||
    `（中文譯文待補：目前顯示英文消化文。／Translation pending — English digest below.）\n\n${bodyEn}`;

  let disagreements: LocalizedText | null = null;
  if (cluster.disagreementHint) {
    const en = cluster.disagreementHint;
    const zh = (await translateToZhTW(en)) || `（譯文待補）${en}`;
    disagreements = { en, "zh-TW": zh };
  }

  return {
    title: { en: stripRawUrls(titleEn), "zh-TW": stripRawUrls(titleZh) },
    summary: { en: stripRawUrls(summaryEn), "zh-TW": stripRawUrls(summaryZh) },
    body: { en: stripRawUrls(bodyEn), "zh-TW": stripRawUrls(bodyZh) },
    disagreements,
    glossary: [],
  };
}

async function main() {
  console.info("[ingest] starting live RSS pipeline…");
  console.info(`[ingest] feeds in allow-list: ${ALLOWED_FEEDS.length}`);

  const llm = getLlmConfig();
  console.info(
    llm
      ? `[ingest] LLM enabled (${llm.baseUrl}, model ${llm.model})`
      : "[ingest] no LLM key — extractive digests + free zh-TW translate"
  );

  const allItems: RawFeedItem[] = [];
  let okFeeds = 0;
  for (const feed of ALLOWED_FEEDS) {
    const items = await fetchFeed(feed);
    if (items.length) okFeeds++;
    allItems.push(...items);
    await sleep(FEED_DELAY_MS);
  }

  if (okFeeds === 0 || allItems.length === 0) {
    console.error("[ingest] FATAL: all feeds failed or returned zero items");
    process.exit(1);
  }

  console.info(
    `[ingest] fetched ${allItems.length} items from ${okFeeds}/${ALLOWED_FEEDS.length} feeds`
  );

  // TW heat discovery → verify against colony news → merge (forum-only stays 審慎)
  const heatCandidates = await discoverTwHeat();
  const heatVerify = await verifyHeatAgainstNews(heatCandidates, allItems, {
    maxQueries: 4,
  });
  if (heatVerify.newsItems.length) {
    allItems.push(...heatVerify.newsItems);
    console.info(
      `[ingest] heat-injected ${heatVerify.newsItems.length} TW news items (sources: ${heatVerify.sourcesShipped.join(",")})`
    );
  } else {
    console.info(
      `[ingest] heat sources shipped: ${heatVerify.sourcesShipped.join(",") || "none"} (no extra news inject)`
    );
  }

  const clusters = clusterItems(allItems);
  console.info(`[ingest] ${clusters.length} clusters before pick`);
  // Small ingest: ≤16 stories → ≤16 LLM digests
  const picked = pickBalancedClusters(clusters, 12, 16, {
    heatKeywords: heatVerify.verifiedKeywords,
  });
  console.info(`[ingest] picked ${picked.length} clusters for main feed`);

  // Enrich top items missing images with og:image (rate-limited)
  let ogBudget = 8;
  for (const c of picked) {
    if (c.bestImage || ogBudget <= 0) continue;
    const primary = c.members[0];
    const og = await fetchOgImage(primary.link);
    if (og) {
      c.bestImage = og;
      ogBudget--;
    }
    await sleep(300);
  }

  // Score for headline picks
  const scored = picked.map((c) => {
    const tb = buildTrustBreakdown(c);
    const raw = computeTrustScore(tb);
    const casualty = isDevelopingCasualtyText(
      c.primaryTitle,
      ...c.members.map((m) => `${m.title} ${m.description}`)
    );
    const rumorGossip = isDevelopingGossipText(
      c.primaryTitle,
      ...c.members.map((m) => `${m.title} ${m.description}`)
    );
    const trustScore = applyTrustCaps(raw, {
      isCasualty: casualty,
      isRumorGossip: rumorGossip,
    });
    return { c, tb, trustScore };
  });
  scored.sort(
    (a, b) =>
      b.trustScore * (1 + 1 / (1 + (Date.now() - Date.parse(a.c.publishedAt)) / 36e5)) -
      a.trustScore * (1 + 1 / (1 + (Date.now() - Date.parse(b.c.publishedAt)) / 36e5))
  );

  const headlineIds = new Set<string>();
  // Mark top 2 editorial by trust*recency among headline candidates
  const candidates = scored.filter(({ c, tb, trustScore }) =>
    isHeadlineCandidate(c, tb, trustScore)
  );
  for (const row of candidates.slice(0, 2)) {
    headlineIds.add(row.c.primaryTitle + row.c.publishedAt);
  }
  // Ensure at least 1–2 headlines if possible
  if (headlineIds.size < 2) {
    for (const row of scored.slice(0, 2)) {
      headlineIds.add(row.c.primaryTitle + row.c.publishedAt);
    }
  }

  const stories: Story[] = [];
  const catCounts: Record<string, number> = {};

  for (let i = 0; i < scored.length; i++) {
    const { c, tb, trustScore } = scored[i];
    // Belt-and-suspenders: never ship eastAsiaGossip without EA feed members / region
    let category = c.category;
    if (
      category === "eastAsiaGossip" &&
      !c.region &&
      !c.members.some((m) => m.category === "eastAsiaGossip")
    ) {
      category = "international";
    }
    const catN = (catCounts[category] ?? 0) + 1;
    catCounts[category] = catN;
    const id = `live-${category}-${String(catN).padStart(2, "0")}-${slugify(c.primaryTitle).slice(0, 24) || "story"}`;

    console.info(`[ingest] digest ${i + 1}/${scored.length}: ${c.primaryTitle.slice(0, 70)}`);
    const loc = await localizeCluster(c, llm);

    let imageUrl: string | undefined;
    if (c.bestImage) {
      const local = await downloadCover(c.bestImage, id);
      if (local) {
        imageUrl = local;
      } else if (/^https:\/\//i.test(c.bestImage)) {
        // Keep remote HTTPS publisher CDN only
        imageUrl = c.bestImage;
      }
    }

    const uniqueSources = new Map<string, { name: string; url: string }>();
    for (const m of c.members) {
      const key = m.link;
      if (!uniqueSources.has(key)) {
        uniqueSources.set(key, { name: m.outletName, url: m.link });
      }
    }

    const key = c.primaryTitle + c.publishedAt;
    const story: Story = {
      id,
      category,
      adult: false,
      isHeadline: headlineIds.has(key),
      isPopular: isPopularCluster(c),
      imageUrl,
      imageAlt: imageUrl
        ? {
            en: `Cover related to: ${c.primaryTitle}`,
            "zh-TW": `相關封面圖：${loc.title["zh-TW"]}`,
          }
        : undefined,
      publishedAt: c.publishedAt,
      title: loc.title,
      summary: loc.summary,
      body: loc.body,
      sources: [...uniqueSources.values()],
      disagreements: loc.disagreements,
      glossary: loc.glossary.length ? loc.glossary : undefined,
      trustScore,
      trustBreakdown: tb,
      tags: [
        category,
        "live-ingest",
        ...(c.region ? [`region:${c.region}`] : []),
        ...c.members.map((m) => m.outletName.toLowerCase().replace(/\s+/g, "-")).slice(0, 3),
      ],
      region: category === "eastAsiaGossip" ? c.region : undefined,
    };
    stories.push(story);
    await sleep(150);
  }

  fs.mkdirSync(path.dirname(OUT_STORIES), { recursive: true });
  fs.writeFileSync(OUT_STORIES, JSON.stringify(stories, null, 2) + "\n", "utf8");

  const byCat: Record<string, number> = {};
  for (const s of stories) {
    byCat[s.category] = (byCat[s.category] ?? 0) + 1;
  }

  const eaByRegion: Record<string, number> = {};
  for (const s of stories) {
    if (s.category !== "eastAsiaGossip") continue;
    const r = s.region ?? "unknown";
    eaByRegion[r] = (eaByRegion[r] ?? 0) + 1;
  }

  const meta = {
    ingestedAt: new Date().toISOString(),
    feedOk: okFeeds,
    feedTotal: ALLOWED_FEEDS.length,
    rawItems: allItems.length,
    mainStories: stories.length,
    byCategory: byCat,
    eastAsiaByRegion: eaByRegion,
    heatSourcesShipped: heatVerify.sourcesShipped,
    heatVerifiedKeywords: heatVerify.verifiedKeywords,
    heatNewsInjected: heatVerify.newsItems.length,
    llmUsed: Boolean(llm),
    mode: llm ? "llm+rss+heat" : "extractive+translate+rss+heat",
  };
  fs.writeFileSync(OUT_META, JSON.stringify(meta, null, 2) + "\n", "utf8");

  console.info("[ingest] wrote", OUT_STORIES);
  console.info("[ingest] meta", meta);
  console.info("[ingest] sample titles:");
  for (const s of stories.slice(0, 5)) {
    console.info(
      `  - [${s.category}] ${s.title.en.slice(0, 80)} | sources: ${s.sources.map((x) => x.name).join(", ")}`
    );
  }
}

main().catch((err) => {
  console.error("[ingest] fatal", err);
  process.exit(1);
});
