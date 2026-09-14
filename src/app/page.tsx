"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { CategoryFilter } from "@/components/CategoryFilter";
import { StoryCard } from "@/components/StoryCard";
import { AdultOptInBanner } from "@/components/AdultGate";
import { getMainStories } from "@/lib/stories";
import { useLanguage } from "@/hooks/useLanguage";
import { usePersonalization } from "@/hooks/usePersonalization";
import type { Category } from "@/lib/types";
import Link from "next/link";

export default function HomePage() {
  const { lang, setLang, ready: langReady } = useLanguage();
  const { state, ready, interact, setAdultOptIn, reset, rank } =
    usePersonalization();
  const [category, setCategory] = useState<Category | "all">("all");

  const feed = useMemo(() => {
    const base = getMainStories().filter(
      (s) => category === "all" || s.category === category
    );
    return rank(base);
  }, [category, rank]);

  if (!ready || !langReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        lang={lang}
        onLangChange={setLang}
        adultOptIn={state.adultOptIn}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-slate-900">
            {lang === "zh-TW" ? "今日摘要" : "Today's digest"}
          </h1>
          <p className="mb-4 text-sm text-slate-600">
            {lang === "zh-TW"
              ? "國際 · 財經 · 科技 · AI — 每則含繁中／英文摘要、多來源連結與可解釋信任分數。離線示範資料。"
              : "International · Finance · Tech · AI — each story has zh-TW/EN summaries, multi-source links, and an explainable trust score. Offline demo seed data."}
          </p>
          <CategoryFilter value={category} onChange={setCategory} lang={lang} />
        </section>

        <section className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>
            {lang === "zh-TW" ? "偏好權重" : "Preference weights"}:{" "}
            {Object.entries(state.weights)
              .map(([k, v]) => `${k} ${v.toFixed(1)}`)
              .join(" · ")}
          </span>
          <button
            type="button"
            onClick={reset}
            className="underline hover:text-slate-800"
          >
            {lang === "zh-TW" ? "重設個人化" : "Reset personalization"}
          </button>
        </section>

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
          {feed.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              {lang === "zh-TW"
                ? "此分類暫無故事（或皆已標為不感興趣）。"
                : "No stories in this category (or all marked not interested)."}
            </p>
          )}
        </div>

        <section className="mb-8 space-y-3">
          <AdultOptInBanner
            lang={lang}
            optedIn={state.adultOptIn}
            onOptIn={() => setAdultOptIn(true)}
            onOptOut={() => setAdultOptIn(false)}
          />
          {state.adultOptIn && (
            <Link
              href="/adult"
              className="inline-flex rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50"
            >
              {lang === "zh-TW" ? "前往成人區 →" : "Go to adult zone →"}
            </Link>
          )}
        </section>

        <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          {lang === "zh-TW"
            ? "Trust-digest 僅提供摘要與來源連結，非全文轉載。信任分數為示範啟發式，不宣稱零誤訊。"
            : "Trust-digest provides summaries and source links only — not full republication. Trust scores are demo heuristics; we do not claim zero misinformation."}
        </footer>
      </main>
    </div>
  );
}
