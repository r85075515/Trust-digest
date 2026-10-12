"use client";

import { useEffect, useRef } from "react";
import type { Language } from "@/lib/types";

interface Props {
  storyId: string;
  storyTitle: string;
  lang: Language;
}

/**
 * Giscus 留言（GitHub Discussions 當後端）
 * 每則新聞用 storyId 開獨立討論串，留言存在 repo Discussions，
 * Bebo 可用 GitHub API 讀取 Ray 的回饋做改進。
 * 需在 repo 安裝 giscus app：https://github.com/apps/giscus
 */
export function Comments({ storyId, storyTitle, lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // 避免重複掛載
    if (ref.current.querySelector("iframe.giscus-frame")) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", "r85075515/Trust-digest");
    script.setAttribute("data-repo-id", "R_kgDOUaOphQ");
    script.setAttribute("data-category", "General");
    script.setAttribute("data-category-id", "DIC_kwDOUaOphc4DH_0m");
    // 每則新聞獨立討論串
    script.setAttribute("data-mapping", "specific");
    script.setAttribute("data-term", `story:${storyId}`);
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", "light");
    script.setAttribute("data-lang", lang === "zh-TW" ? "zh-TW" : "en");
    script.setAttribute("data-loading", "lazy");
    ref.current.appendChild(script);

    return () => {
      // 清理（語言切換時重掛）
      ref.current?.querySelectorAll("iframe.giscus-frame").forEach((el) => el.remove());
      ref.current?.querySelectorAll('script[src*="giscus"]').forEach((el) => el.remove());
    };
  }, [storyId, lang]);

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">
        {lang === "zh-TW" ? "留言" : "Comments"}
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        {lang === "zh-TW"
          ? "有想法直接寫在下面，我們會參考你的留言改進摘要品質。"
          : "Share your thoughts below — we use your feedback to improve."}
      </p>
      <div ref={ref} className="giscus" data-story-title={storyTitle} />
    </section>
  );
}
