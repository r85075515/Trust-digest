"use client";

import { useMemo } from "react";
import { Header } from "@/components/Header";
import { StoryCard } from "@/components/StoryCard";
import { AdultBlocked } from "@/components/AdultGate";
import { getAdultStories } from "@/lib/stories";
import { useLanguage } from "@/hooks/useLanguage";
import { usePersonalization } from "@/hooks/usePersonalization";

export default function AdultPage() {
  const { lang, setLang, ready: langReady } = useLanguage();
  const { state, ready, interact, setAdultOptIn, rank } = usePersonalization();

  const feed = useMemo(() => rank(getAdultStories()), [rank]);

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
        {!state.adultOptIn ? (
          <AdultBlocked lang={lang} onOptIn={() => setAdultOptIn(true)} />
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <h1 className="mb-1 text-xl font-bold text-rose-950">
                {lang === "zh-TW"
                  ? "成人／NSFW 專區"
                  : "Adult / NSFW zone"}
              </h1>
              <p className="text-sm text-rose-900/80">
                {lang === "zh-TW"
                  ? "與主訊息流完全分離。僅含清楚標示的合法成人主題示範卡片（摘要＋連結，非全文）。"
                  : "Fully separate from the main feed. Clearly labeled legal adult-topic sample cards only (summaries + links, not full text)."}
              </p>
              <button
                type="button"
                onClick={() => setAdultOptIn(false)}
                className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-900 hover:bg-rose-100"
              >
                {lang === "zh-TW" ? "關閉並離開成人區" : "Turn off & leave adult zone"}
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>
          </>
        )}
      </main>
    </div>
  );
}
