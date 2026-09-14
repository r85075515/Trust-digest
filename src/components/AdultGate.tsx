"use client";

import type { Language } from "@/lib/types";

export function AdultOptInBanner({
  lang,
  optedIn,
  onOptIn,
  onOptOut,
}: {
  lang: Language;
  optedIn: boolean;
  onOptIn: () => void;
  onOptOut: () => void;
}) {
  if (optedIn) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            {lang === "zh-TW"
              ? "限制級／成人區已啟用（與主訊息流完全分離；18+ 合法產業新聞）。"
              : "Adult / restricted zone enabled (fully separate from the main feed; 18+ legal industry news)."}
          </p>
          <button
            type="button"
            onClick={onOptOut}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-medium hover:bg-rose-100"
          >
            {lang === "zh-TW" ? "關閉成人區" : "Turn off adult zone"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <p className="mb-2 font-medium">
        {lang === "zh-TW"
          ? "限制級／成人內容預設關閉"
          : "Adult / restricted content is off by default"}
      </p>
      <p className="mb-3 text-xs text-slate-500">
        {lang === "zh-TW"
          ? "僅在明確選擇加入後，才會顯示獨立成人區中的 18+ 合法成人娛樂產業／表演者／平台政策樣本。不會混入主訊息流。"
          : "Only after explicit opt-in will 18+ legal adult-entertainment industry / performer / platform-policy samples appear on a separate adult route. Never mixed into the main feed."}
      </p>
      <button
        type="button"
        onClick={onOptIn}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
      >
        {lang === "zh-TW" ? "我已滿 18 歲，啟用限制級區" : "I am 18+ — enable adult zone"}
      </button>
    </div>
  );
}

export function AdultBlocked({
  lang,
  onOptIn,
}: {
  lang: Language;
  onOptIn: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
      <span className="mb-3 inline-block rounded bg-rose-700 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
        {lang === "zh-TW" ? "限制級 18+" : "ADULT 18+"}
      </span>
      <h1 className="mb-2 text-xl font-bold text-slate-900">
        {lang === "zh-TW" ? "成人區未啟用" : "Adult zone not enabled"}
      </h1>
      <p className="mb-4 text-sm text-slate-600">
        {lang === "zh-TW"
          ? "此區與主訊息流分離，預設關閉。僅在明確選擇加入後可見合法成人產業新聞樣本。"
          : "This section is separate from the main feed and off by default. Visible only after explicit opt-in — legal adult-industry samples only."}
      </p>
      <button
        type="button"
        onClick={onOptIn}
        className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
      >
        {lang === "zh-TW" ? "明確選擇加入（18+）" : "Explicitly opt in (18+)"}
      </button>
    </div>
  );
}
