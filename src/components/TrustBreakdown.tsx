import { TRUST_FACTOR_LABELS } from "@/lib/trust";
import type { Language, TrustBreakdown as TB } from "@/lib/types";

export function TrustBreakdownPanel({
  breakdown,
  score,
  lang,
}: {
  breakdown: TB;
  score: number;
  lang: Language;
}) {
  const entries = Object.entries(breakdown) as [keyof TB, number][];

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-1 text-sm font-semibold text-slate-900">
        {lang === "zh-TW" ? "信任分數拆解" : "Trust score breakdown"}
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        {lang === "zh-TW"
          ? `總分 ${score}/100。示意啟發式：來源多樣性、媒體聲譽、交叉驗證、時效與清晰度各最高 25 分。非保證零誤訊。`
          : `Total ${score}/100. Heuristic demo: source diversity, outlet reputation, cross-corroboration, recency & clarity (max 25 each). Not a zero-misinfo guarantee.`}
      </p>
      <ul className="space-y-2">
        {entries.map(([key, value]) => {
          const meta = TRUST_FACTOR_LABELS[key];
          const pct = Math.round((value / meta.max) * 100);
          return (
            <li key={key}>
              <div className="mb-0.5 flex justify-between text-xs text-slate-700">
                <span>{meta[lang]}</span>
                <span>
                  {value}/{meta.max}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
