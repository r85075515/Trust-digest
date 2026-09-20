"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { CategoryFilter } from "@/components/CategoryFilter";
import { StoryCard } from "@/components/StoryCard";
import { HeadlineBlock } from "@/components/HeadlineBlock";
import { getMainStories } from "@/lib/stories";
import { useLanguage } from "@/hooks/useLanguage";
import { usePersonalization } from "@/hooks/usePersonalization";
import type { Category } from "@/lib/types";
import ingestMeta from "../../data/ingest-meta.json";

function formatIngestTime(iso: string | null, lang: "zh-TW" | "en"): string {
  if (!iso) return lang === "zh-TW" ? "尚未執行" : "not yet run";
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang === "zh-TW" ? "zh-TW" : "en-US", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " UTC";
  } catch {
    return iso;
  }
}

export default function HomePage() {
  const { lang, setLang, ready: langReady } = useLanguage();
  const { state, ready, interact, reset, rank } = usePersonalization();
  const [category, setCategory] = useState<Category | "all">("all");

  const { headlines, feed } = useMemo(() => {
    const base = getMainStories().filter(
      (s) => category === "all" || s.category === category
    );
    const ranked = rank(base);
    // Show headline block only on the "all" feed (distinct top section)
    const headlineIds = new Set(
      category === "all"
        ? ranked.filter((s) => s.isHeadline).slice(0, 2).map((s) => s.id)
        : []
    );
    const headlines =
      category === "all"
        ? ranked.filter((s) => headlineIds.has(s.id)).slice(0, 2)
        : [];
    const feed = ranked.filter((s) => !headlineIds.has(s.id));
    return { headlines, feed };
  }, [category, rank]);

  if (!ready || !langReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  const ingestLabel = formatIngestTime(
    (ingestMeta as { ingestedAt?: string | null }).ingestedAt ?? null,
    lang
  );

  return (
    <div className="min-h-screen">
      <Header lang={lang} onLangChange={setLang} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-slate-900">
            {lang === "zh-TW" ? "今日摘要" : "Today's digest"}
          </h1>
          <p className="mb-4 text-sm text-slate-600">
            {lang === "zh-TW"
              ? `國際 · 財經 · 科技 · AI · 熱門八卦（可驗證）— 訊息流以熱門與頭條為主。首頁短摘要，點進內頁可讀完整消化文。標題用具名專有名詞；來源一致度標籤優先於「高信任」宣稱（啟發式，非事實查核保證）。即時 RSS 彙整 · 上次更新：${ingestLabel}。`
              : `International · Finance · Tech · AI · Hot gossip (verifiable) — feed prioritizes Popular and Headline stories. Short briefings on home; full digests on detail pages. Titles lead with proper nouns. Source-agreement labels preferred over “High trust” claims (heuristics, not fact-check guarantees). Live RSS ingest · last updated: ${ingestLabel}.`}
          </p>
          <CategoryFilter value={category} onChange={setCategory} lang={lang} />
        </section>

        <section className="mb-4 flex flex-wrap items-center justify-end gap-3 text-xs text-slate-400">
          <button
            type="button"
            onClick={reset}
            className="underline hover:text-slate-700"
          >
            {lang === "zh-TW" ? "重設個人化" : "Reset personalization"}
          </button>
        </section>

        <HeadlineBlock
          stories={headlines}
          lang={lang}
          state={state}
          onOpen={(story) => interact(story, "open")}
          onSave={(story) => interact(story, "save")}
          onNotInterested={(story) => interact(story, "not_interested")}
        />

        <div className="mb-8 grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {feed.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              lang={lang}
              state={state}
              onOpen={() => interact(story, "open")}
              onSave={() => interact(story, "save")}
              onNotInterested={() => interact(story, "not_interested")}
            />
          ))}
          {feed.length === 0 && headlines.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              {lang === "zh-TW"
                ? "此分類暫無故事（或皆已標為不感興趣）。"
                : "No stories in this category (or all marked not interested)."}
            </p>
          )}
        </div>

        <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          {lang === "zh-TW"
            ? "Axiom 提供短摘要與消化文，並連結原始來源，非全文轉載。信任分數為啟發式指標，不宣稱零誤訊。主訊息流來自允許清單 RSS。"
            : "Axiom provides short briefings and digest articles with links to original sources — not full republication. Trust scores are heuristics; we do not claim zero misinformation. Main feed is live allow-listed RSS."}
        </footer>
      </main>
    </div>
  );
}
