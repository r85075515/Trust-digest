# Axiom

Multi-source **verified news digest** MVP — bilingual (**Traditional Chinese / English**), explainable trust scores, personalization, cover images, headline treatment, and a **separate adult/限制級 zone** (off by default).

> Demo uses **static JSON seed data** so it runs offline without live scraping. Cover images use seeded [picsum.photos](https://picsum.photos) placeholders.

## Quick start

```bash
cd Trust-digest   # or: /workspace/Trust-digest
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script        | Purpose              |
|---------------|----------------------|
| `npm run dev` | Local development    |
| `npm run build` | Production build   |
| `npm start`   | Serve production build |

## What you get

- **Categories:** International, Finance, Tech, AI, Entertainment (演藝), Beauty (美妝) (main feed)
- **Languages:** Every story has `zh-TW` + `en` title, short `summary` (home cards), and full `body` digest article (detail page)
- **Images:** Optional `imageUrl` + localized `imageAlt` on each story — thumbnails on cards, larger cover on detail
- **Headlines:** Stories with `isHeadline: true` appear in a distinct 頭條 / HEADLINE block at the top of the home feed (1–2 items)
- **Story cards / detail:** home cards keep short briefings; detail pages show a fuller AI digest article (lede → what happened → why it matters → source agreement/disagreement → uncertainties), cover image, outlet links, trust score 0–100 with breakdown, tags
- **Personalization:** opens / saves / not-interested via `localStorage`; feed ranking uses category preference weights
- **Adult / 限制級:** `/adult` only, **default off**, explicit 18+ opt-in; never mixed into the main feed. Seed cards cover legal adult-entertainment industry / performer career / platform-policy topics only

## Story data shape (`data/stories.json`)

| Field | Notes |
|-------|--------|
| `id`, `category`, `adult`, `publishedAt` | Core identity |
| `isHeadline?` | When `true`, eligible for the home HEADLINE block |
| `imageUrl?`, `imageAlt?` | Cover/thumbnail (`imageAlt` is `{ "zh-TW", "en" }`) |
| `title`, `summary`, `body` | LocalizedText — `summary` for cards; `body` is the full digest article on detail |
| `sources[]`, `disagreements`, `trustScore`, `trustBreakdown`, `tags` | As before |

## Trust-score methodology (honest)

Scores are a **demo heuristic**, not a fact-checker and **not a claim of zero misinformation**.

Each story’s score is the sum of four capped factors (max **25** each → **0–100**):

| Factor | What it approximates |
|--------|----------------------|
| Source diversity | How many distinct outlets are listed |
| Outlet reputation | Curated prior for known wire/quality outlets (hand-set in seed) |
| Cross-corroboration | Whether multiple sources align on core facts |
| Recency & clarity | Freshness + how concrete the summary is |

Breakdown UI shows each factor. Seed values are **author-assigned for the demo**; a future ingest pipeline would compute them from live clusters (see `src/lib/rss-ingest.ts`).

## Copyright note

**Axiom** shows **original short summaries** and **links to source outlets**. It does **not** republish full articles. Respect publisher terms; do not scrape paywalled full text. Sample adult cards use clearly labeled placeholder/example URLs for legal adult *topics* only (18+ performers/industry/news). Cover images are placeholder stock via picsum.

## Project layout

```
data/stories.json              # Offline seed stories (incl. adult samples + images)
src/app/page.tsx               # Main feed + HEADLINE block
src/app/story/[id]/page.tsx
src/app/adult/page.tsx         # Opt-in adult / 限制級 zone
src/components/HeadlineBlock.tsx
src/components/StoryCard.tsx
src/lib/personalization.ts     # localStorage weights & ranking
src/lib/trust.ts               # Score helpers / labels
src/lib/rss-ingest.ts          # Stub + TODOs for future RSS
```

## 14-day roadmap

| Day | Focus |
|-----|--------|
| 1–2 | Polish UI, a11y, empty states; add more seed clusters |
| 3–4 | Wire RSS stub fetch behind a feature flag (allow-listed feeds only) |
| 5–6 | Event clustering + simple disagreement detection |
| 7–8 | Trust factors from real signals (outlet list, time, #sources) |
| 9–10 | Optional account sync (keep localStorage as fallback) |
| 11–12 | Adult zone moderation labels + stricter age gate copy |
| 13–14 | Deploy preview, feedback pass, README/ops checklist |

## Non-goals (MVP)

Native apps, live paywall scraping, payments, claiming zero misinformation.

## License / contribution

Private MVP repo. Summaries are original demo text; linked brands remain their owners’.
