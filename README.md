# Axiom

Multi-source **verified news digest** MVP — bilingual (**Traditional Chinese / English**), explainable trust scores, personalization, cover images, and **Popular（熱門）** + **Headline（頭條）** treatment. The home feed prioritizes high-buzz Popular stories and important Headline news.

> **Live ingest:** stories come from allow-listed RSS (summarize + link only). Run `npm run ingest` to refresh `data/stories.json`. Trust scores are **heuristics**, not fact-check guarantees.

## Quick start

```bash
cd Trust-digest   # or: /workspace/Trust-digest
npm install
npm run ingest    # fetch allow-listed RSS → data/stories.json
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script          | Purpose                                      |
|-----------------|----------------------------------------------|
| `npm run ingest`| Live RSS pipeline → `data/stories.json`      |
| `npm run dev`   | Local development                            |
| `npm run build` | Production build                             |
| `npm start`     | Serve production build                       |

## Live ingest (`npm run ingest`)

Pipeline (`scripts/ingest.ts` + `src/lib/rss-ingest.ts`):

1. Fetch curated allow-list feeds (polite User-Agent, timeout, per-feed delay).
2. Parse RSS/Atom (`rss-parser`); normalize title, link, pubDate, description, image (`media:content` / enclosure / first `<img>`; optional `og:image` for a few top items).
3. Retune category with heuristics (celebrity/K-pop → entertainment; crime/accidents → society; drop film-festival academia noise).
4. Cluster near-duplicates by title token Jaccard within each category.
5. Compute trust breakdown: source diversity, outlet reputation map, cross-corroboration, recency & clarity → `computeTrustScore()`.
6. Digests:
   - **If** `AXIOM_LLM_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` is set → OpenAI-compatible chat (xAI if key starts with `xai-` or `AXIOM_LLM_BASE_URL` points at xAI). Never invent facts not in titles/snippets.
   - **Else** extractive digest from title+description + best-effort zh-TW via `@vitalets/google-translate-api` (if translate fails, keep EN and note 「譯文待補」).
7. Download related covers into `public/covers/live/` when possible; otherwise keep HTTPS publisher CDN URLs only (no unrelated placeholders).
8. Overwrite `data/stories.json` (100% live) + write `data/ingest-meta.json`.

Fail loudly if every feed fails.

### Optional LLM env

```bash
export AXIOM_LLM_API_KEY=xai-...      # or OPENAI_API_KEY / XAI_API_KEY
# export AXIOM_LLM_BASE_URL=https://api.x.ai/v1
# export AXIOM_LLM_MODEL=grok-3-mini
npm run ingest
```

The ingest script also loads `card.AXIOM_LLM_API_KEY` from `/home/box/agent-data/box-secrets.json` when env is unset (key is never printed).

### Feed allow-list (v1)

Verified free RSS used by the pipeline:

| Category        | Outlets |
|-----------------|---------|
| International   | BBC World, NPR World, The Guardian World, NYT World |
| Finance         | CNBC, MarketWatch, Yahoo Finance, BBC Business, Guardian Business |
| Tech            | TechCrunch, The Verge, BBC Technology, Ars Technica, Engadget |
| AI              | MIT News AI, Wired AI, ScienceDaily AI, Google AI Blog |
| Entertainment   | Billboard, Rolling Stone Music, Soompi, Koreaboo, TMZ, Hollywood Life, Just Jared, ET Online, BBC Entertainment |
| Society         | CBS News Crime, Sky News UK, BBC UK, LA Times California, Guardian UK News, NPR News |
| Beauty          | Allure, Fashionista |

**Entertainment** means celebrity / pop culture (singers, actors, K-pop / J-pop, Hollywood, TW·CN·JP·KR·US/EU idols) — not Broadway reviews or film-festival academia.

**Society** means social news: accidents, crime, disasters, public safety / civic incidents — not geopolitics or pure finance.

Dead feeds are skipped at fetch time; drop/replace in `ALLOWED_FEEDS` if a URL stops returning 200.

## What you get

- **Categories:** International, Finance, Tech, AI, Entertainment (演藝), Society (社會), Beauty (美妝)
- **Languages:** Every story has `zh-TW` + `en` title, short `summary` (home cards), and full `body` digest article (detail page)
- **Images:** Optional `imageUrl` + localized `imageAlt` — from feed/og when available (local copy under `/covers/live/` or HTTPS CDN)
- **Headlines & Popular:** `isHeadline` / `isPopular` from cluster size, reputation, trust×recency, and simple trending keywords
- **Trust score:** four capped factors (max 25 each → 0–100); see methodology below
- **Personalization:** opens / saves / not-interested via `localStorage`

## Story data shape (`data/stories.json`)

| Field | Notes |
|-------|--------|
| `id`, `category`, `adult`, `publishedAt` | Core identity (`adult` always `false`; legacy field) |
| `isHeadline?` | Home HEADLINE block |
| `isPopular?` | 熱門 / Popular badge |
| `imageUrl?`, `imageAlt?` | Cover/thumbnail |
| `title`, `summary`, `body` | LocalizedText |
| `sources[]`, `disagreements`, `trustScore`, `trustBreakdown`, `tags` | Live: `live-ingest` |

`data/ingest-meta.json` records last ingest time and category counts (shown on the home page).

## Trust-score methodology (honest)

Scores are a **heuristic**, not a fact-checker and **not a claim of zero misinformation**.

| Factor | Live signal |
|--------|-------------|
| Source diversity | Unique outlets in the cluster (capped 25) |
| Outlet reputation | Curated domain→score map (BBC/NPR/NYT high; blogs lower) |
| Cross-corroboration | Cluster size / agreement; reduced if numeric disagreements detected |
| Recency & clarity | pubDate age + description length |

## Copyright & image policy

- **Summarize + link only.** Axiom writes original short digests from feed titles/descriptions and links to publishers. It does **not** republish full articles or scrape paywalled text.
- **Covers:** thumbnails from feed media / `og:image` are stored locally for UI link-out cards (thumbnail fair use). If download fails, only HTTPS publisher CDN URLs are kept — never unrelated stock placeholders for live stories.

## Project layout

```
data/stories.json              # Live main feed
data/ingest-meta.json          # Last ingest timestamp / counts
scripts/ingest.ts              # npm run ingest
src/lib/rss-ingest.ts          # Allow-list, classify, cluster, trust helpers
src/app/page.tsx               # Main feed + HEADLINE block
public/covers/live/            # Downloaded live thumbnails
```

## Non-goals (MVP)

Native apps, live paywall scraping, payments, claiming zero misinformation.

## License / contribution

Private MVP repo. Digests are original summaries; linked brands and cover thumbnails remain their owners’. Product name **Axiom**; GitHub repo **Trust-digest**.
