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
            <div className="mb-6 rounded-xl border border-rose-300 bg-rose-50 p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded bg-rose-700 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
                  {lang === "zh-TW" ? "限制級 18+" : "ADULT 18+"}
                </span>
                <h1 className="text-xl font-bold text-rose-950">
                  {lang === "zh-TW"
                    ? "成人／限制級專區"
                    : "Adult / Restricted zone"}
                </h1>
              </div>
              <p className="text-sm text-rose-900/80">
                {lang === "zh-TW"
                  ? "與主訊息流完全分離。僅含清楚標示的合法成人娛樂產業／表演者／平台政策新聞樣本（短摘要＋消化文＋來源連結，非原文轉載）。不含未成年相關內容。"
                  : "Fully separate from the main feed. Clearly labeled legal adult-entertainment industry / performer / platform-policy sample cards only (short briefings + digest articles + source links, not original full-text republication). No content involving minors."}
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
