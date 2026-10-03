"use client";

import type { Language, PersonalizationState, Story } from "@/lib/types";

interface Props {
  story: Story;
  state: PersonalizationState;
  lang: Language;
  onOpen?: () => void;
  onSave: () => void;
  onNotInterested: () => void;
  compact?: boolean;
}

export function InteractionButtons({
  story,
  state,
  lang,
  onSave,
  onNotInterested,
  compact,
}: Props) {
  const saved = state.savedIds.includes(story.id);
  const muted = state.notInterestedIds.includes(story.id);

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSave();
        }}
        className={`rounded-lg border px-2.5 py-1 font-medium transition ${
          saved
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
        }`}
      >
        {saved
          ? lang === "zh-TW"
            ? "已收藏"
            : "Saved"
          : lang === "zh-TW"
            ? "收藏"
            : "Save"}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onNotInterested();
        }}
        className={`rounded-lg border px-2.5 py-1 font-medium transition ${
          muted
            ? "border-slate-400 bg-slate-200 text-slate-600"
            : "border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:text-rose-700"
        }`}
      >
        {lang === "zh-TW" ? "不感興趣" : "Not interested"}
      </button>
    </div>
  );
}
