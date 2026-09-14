/**
 * Stub: future RSS / Atom ingest pipeline.
 *
 * TODO:
 * - Fetch feeds from a curated allow-list (international, finance, tech, AI).
 * - Deduplicate by URL + title similarity.
 * - Extract plain-language summaries (LLM or extractive) — never full republication.
 * - Detect disagreements across outlets covering the same event cluster.
 * - Score trust factors (diversity, reputation, corroboration, recency).
 * - Separate adult feeds behind explicit opt-in; never merge into main ingest.
 * - Respect robots.txt, rate limits, and copyright (link + summarize only).
 */

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: "international" | "finance" | "tech" | "ai" | "adult";
  language: "zh-TW" | "en" | "mixed";
}

/** Curated feed list for a future live pipeline. Not fetched in the MVP demo. */
export const PLANNED_FEEDS: FeedSource[] = [
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    category: "international",
    language: "en",
  },
  {
    id: "reuters-business",
    name: "Reuters Business",
    url: "https://www.reutersagency.com/feed/",
    category: "finance",
    language: "en",
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    category: "tech",
    language: "en",
  },
  {
    id: "mit-ai",
    name: "MIT News AI",
    url: "https://news.mit.edu/rss/topic/artificial-intelligence2",
    category: "ai",
    language: "en",
  },
];

/**
 * Placeholder ingest. Returns empty until live fetching is implemented.
 * MVP uses static JSON seed data instead.
 */
export async function ingestFeeds(_sources: FeedSource[] = PLANNED_FEEDS) {
  // TODO: implement HTTP fetch + parse + normalize
  console.info(
    "[rss-ingest] Stub only — using seed data. Planned sources:",
    _sources.length
  );
  return [];
}
