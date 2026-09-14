"use client";

import type { Category, Language } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/stories";

const MAIN: Array<Category | "all"> = [
  "all",
  "international",
  "finance",
  "tech",
  "ai",
  "entertainment",
  "beauty",
];

export function CategoryFilter({
  value,
  onChange,
  lang,
}: {
  value: Category | "all";
  onChange: (c: Category | "all") => void;
  lang: Language;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MAIN.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            value === c
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {CATEGORY_LABELS[c][lang]}
        </button>
      ))}
    </div>
  );
}
