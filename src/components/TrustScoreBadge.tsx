import { trustColorClass, trustLabel } from "@/lib/trust";
import type { Language } from "@/lib/types";

export function TrustScoreBadge({
  score,
  lang,
  size = "md",
}: {
  score: number;
  lang: Language;
  size?: "sm" | "md";
}) {
  const label =
    lang === "zh-TW"
      ? score >= 75
        ? "高信任"
        : score >= 50
          ? "中等"
          : "偏低"
      : trustLabel(score);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${trustColorClass(
        score
      )} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}
      title={lang === "zh-TW" ? "示意信任分數（非事實查核保證）" : "Illustrative trust score (not a fact-check guarantee)"}
    >
      <span>{score}</span>
      <span className="font-normal opacity-80">/100 · {label}</span>
    </span>
  );
}
