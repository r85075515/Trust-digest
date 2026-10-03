"use client";

import Link from "next/link";
import type { Language, PersonalizationState, Story } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/stories";
import { TrustScoreBadge } from "./TrustScoreBadge";
import { InteractionButtons } from "./InteractionButtons";

interface Props {
  stories: Story[];
  lang: Language;
  state: PersonalizationState;
  onOpen: (story: Story) => void;
  onSave: (story: Story) => void;
  onNotInterested: (story: Story) => void;
}

export function HeadlineBlock({
  stories,
  lang,
  state,
  onOpen,
  onSave,
  onNotInterested,
}: Props) {
  if (stories.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
          {lang === "zh-TW" ? "頭條" : "HEADLINE"}
        </span>
        <h2 className="text-sm font-semibold text-slate-700">
          {lang === "zh-TW" ? "今日重要新聞" : "Top stories"}
        </h2>
      </div>
      <div
        className={`grid gap-4 ${
          stories.length > 1 ? "md:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {stories.map((story) => {
          const alt = story.imageAlt?.[lang] ?? story.title[lang];
          return (
            <article
              key={story.id}
              className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50/80 to-white shadow-md"
            >
              {story.imageUrl && (
                <Link
                  href={`/story/${story.id}`}
                  onClick={() => onOpen(story)}
                  className="block"
                >
                  <div className="relative aspect-[21/9] w-full bg-slate-200 sm:aspect-[2/1]">
                    <img
                      src={story.imageUrl}
                      alt={alt}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-white shadow">
                        {lang === "zh-TW" ? "頭條" : "HEADLINE"}
                      </span>
                      {story.isPopular && (
                        <span className="rounded-md bg-violet-600 px-2.5 py-1 text-xs font-bold text-white shadow">
                          {lang === "zh-TW" ? "熱門" : "Popular"}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )}
              <div className="p-5 sm:p-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {CATEGORY_LABELS[story.category][lang]}
                  </span>
                  {story.isPopular && (
                    <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-900">
                      {lang === "zh-TW" ? "熱門" : "Popular"}
                    </span>
                  )}
                  <TrustScoreBadge
                    score={story.trustScore}
                    lang={lang}
                    size="sm"
                    sourceCount={story.sources.length}
                    hasDisagreement={Boolean(story.disagreements)}
                    titleText={story.title.en + " " + story.title["zh-TW"]}
                    summaryText={story.summary.en + " " + story.summary["zh-TW"]}
                    category={story.category}
                    sourceDomains={story.sources.map((s) => {
                      try {
                        return new URL(s.url).hostname;
                      } catch {
                        return s.name;
                      }
                    })}
                  />
                </div>
                <Link
                  href={`/story/${story.id}`}
                  onClick={() => onOpen(story)}
                  className="block"
                >
                  <h3 className="mb-2 text-xl font-bold leading-snug text-slate-900 hover:text-blue-700 sm:text-2xl">
                    {story.title[lang]}
                  </h3>
                  <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                    {story.summary[lang]}
                  </p>
                </Link>
                <InteractionButtons
                  story={story}
                  state={state}
                  lang={lang}
                  onSave={() => onSave(story)}
                  onNotInterested={() => onNotInterested(story)}
                  compact
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
