import {
  applyTrustCaps,
  honestyColorClass,
  honestyKind,
  honestyLabel,
  isDevelopingCasualtyText,
  isDevelopingGossipText,
} from "@/lib/trust";
import type { Language } from "@/lib/types";

export function TrustScoreBadge({
  score,
  lang,
  size = "md",
  sourceCount = 1,
  hasDisagreement = false,
  titleText,
  summaryText,
  showScore = false,
}: {
  score: number;
  lang: Language;
  size?: "sm" | "md";
  sourceCount?: number;
  hasDisagreement?: boolean;
  titleText?: string;
  summaryText?: string;
  /** When false (default), emphasize honesty label over big numeric score. */
  showScore?: boolean;
}) {
  const isCasualty = isDevelopingCasualtyText(titleText, summaryText);
  const isRumorGossip = isDevelopingGossipText(titleText, summaryText);
  const capped = applyTrustCaps(score, { isCasualty, isRumorGossip });
  const kind = honestyKind({
    sourceCount,
    hasDisagreement,
    isCasualty,
    isRumorGossip,
  });
  const label = honestyLabel(kind, sourceCount, lang);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${honestyColorClass(
        kind
      )} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}
      title={
        lang === "zh-TW"
          ? `來源一致度標籤（啟發式，非事實查核保證）${showScore || isCasualty || isRumorGossip ? ` · 分數 ${capped}/100` : ""}`
          : `Source-agreement label (heuristic, not a fact-check guarantee)${showScore || isCasualty || isRumorGossip ? ` · score ${capped}/100` : ""}`
      }
    >
      <span className="font-medium">{label}</span>
      {(showScore || kind === "unconfirmed" || kind === "cautious") && (
        <span className="font-normal opacity-70">· {capped}</span>
      )}
    </span>
  );
}
