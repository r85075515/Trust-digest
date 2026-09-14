"use client";

import Link from "next/link";
import type { Language, PersonalizationState, Story } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/stories";
import { TrustScoreBadge } from "./TrustScoreBadge";
import { InteractionButtons } from "./InteractionButtons";

interface Props {
  story: Story;
  lang: Language;
  state: PersonalizationState;
  onOpen: () => void;
  onSave: () => void;
  onNotInterested: () => void;
}

export function StoryCard({
  story,
  lang,
  state,
  onOpen,
  onSave,
  onNotInterested,
}: Props) {
  const cat = CATEGORY_LABELS[story.category][lang];
  const opened = state.openedIds.includes(story.id);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {cat}
        </span>
        {story.adult && (
          <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
            NSFW
          </span>
        )}
        <TrustScoreBadge score={story.trustScore} lang={lang} size="sm" />
        {opened && (
          <span className="text-xs text-slate-400">
            {lang === "zh-TW" ? "已讀" : "Opened"}
          </span>
        )}
      </div>
      <Link href={`/story/${story.id}`} onClick={onOpen} className="block">
        <h2 className="mb-2 text-lg font-semibold leading-snug text-slate-900 hover:text-blue-700">
          {story.title[lang]}
        </h2>
        <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
          {story.summary[lang]}
        </p>
      </Link>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {story.tags
          .filter((t) => t.toLowerCase() !== "nsfw")
          .slice(0, 4)
          .map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500"
            >
              #{tag}
            </span>
          ))}
        <span className="text-[11px] text-slate-400">
          {story.sources.length}{" "}
          {lang === "zh-TW" ? "來源" : "sources"}
        </span>
      </div>
      <InteractionButtons
        story={story}
        state={state}
        lang={lang}
        onSave={onSave}
        onNotInterested={onNotInterested}
        compact
      />
    </article>
  );
}
