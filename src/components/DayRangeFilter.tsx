"use client";

import type { Language } from "@/lib/types";
import type { DayRange } from "@/lib/retention";
import { DAY_RANGE_LABELS } from "@/lib/retention";

const RANGES: DayRange[] = ["today", "7d", "30d"];

export function DayRangeFilter({
  value,
  onChange,
  lang,
}: {
  value: DayRange;
  onChange: (r: DayRange) => void;
  lang: Language;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            value === r
              ? "bg-amber-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {DAY_RANGE_LABELS[r][lang]}
        </button>
      ))}
    </div>
  );
}
