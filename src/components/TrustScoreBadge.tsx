import {
  applyTrustCaps,
  classifyCelebrityDeathRumor,
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
  category,
  sourceDomains,
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
  /** Story category — used for celebrity death-rumor path. */
  category?: string;
  /** Publisher domains when available (for mainstream-obituary detection). */
  sourceDomains?: string[];
}) {
  const isCasualty = isDevelopingCasualtyText(titleText, summaryText);
  const isRumorGossip = isDevelopingGossipText(titleText, summaryText);
  const deathPath = classifyCelebrityDeathRumor({
    category,
    texts: [titleText, summaryText],
    domains: sourceDomains ?? [],
    hasCommunityHeat:
      isRumorGossip ||
      (sourceDomains ?? []).some((d) => /ptt\.cc|dcard\.tw/i.test(d)),
  });
  const capped = applyTrustCaps(score, {
    isCasualty: isCasualty || deathPath === "confirmed_obituary",
    isRumorGossip: isRumorGossip || deathPath === "unconfirmed_rumor",
    deathPath,
  });
  const kind = honestyKind({
    sourceCount,
    hasDisagreement: hasDisagreement || deathPath === "disputed",
    isCasualty,
    isRumorGossip,
    deathPath,
  });
  const label = honestyLabel(kind, sourceCount, lang);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${honestyColorClass(
        kind
      )} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}
      title={
        lang === "zh-TW"
          ? `來源一致度標籤（啟發式，非事實查核保證）${showScore || isCasualty || isRumorGossip || deathPath ? ` · 分數 ${capped}/100` : ""}${deathPath ? ` · 名人死訊路徑:${deathPath}` : ""}`
          : `Source-agreement label (heuristic, not a fact-check guarantee)${showScore || isCasualty || isRumorGossip || deathPath ? ` · score ${capped}/100` : ""}${deathPath ? ` · celeb-death:${deathPath}` : ""}`
      }
    >
      <span className="font-medium">{label}</span>
      {(showScore || kind === "unconfirmed" || kind === "cautious" || kind === "debunk") && (
        <span className="font-normal opacity-70">· {capped}</span>
      )}
    </span>
  );
}
