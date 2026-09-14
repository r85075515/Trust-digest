# Trust-digest

Multi-source **verified news digest** MVP — bilingual (**Traditional Chinese / English**), explainable trust scores, personalization, and a **separate adult/NSFW zone** (off by default).

> Demo uses **static JSON seed data** so it runs offline without live scraping.

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

- **Categories:** International, Finance, Tech, AI (main feed)
- **Languages:** Every story has `zh-TW` + `en` title & summary (toggle in header)
- **Story cards / detail:** plain-language summary, multiple outlet links, disagreements when present, trust score 0–100 with breakdown, tags
- **Personalization:** opens / saves / not-interested via `localStorage`; feed ranking uses category preference weights
- **Adult / NSFW:** `/adult` only, **default off**, explicit opt-in; never mixed into the main feed

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

Trust-digest shows **original short summaries** and **links to source outlets**. It does **not** republish full articles. Respect publisher terms; do not scrape paywalled full text. Sample adult cards use clearly labeled placeholder/example URLs for legal adult *topics* only.

## Project layout

```
data/stories.json          # Offline seed stories (incl. adult samples)
src/app/page.tsx           # Main feed
src/app/story/[id]/page.tsx
src/app/adult/page.tsx     # Opt-in adult zone
src/lib/personalization.ts # localStorage weights & ranking
src/lib/trust.ts           # Score helpers / labels
src/lib/rss-ingest.ts      # Stub + TODOs for future RSS
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
