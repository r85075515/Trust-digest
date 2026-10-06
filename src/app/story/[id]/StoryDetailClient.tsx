"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { TrustBreakdownPanel } from "@/components/TrustBreakdown";
import { InteractionButtons } from "@/components/InteractionButtons";
import { CATEGORY_LABELS } from "@/lib/stories";
import type { ReactNode } from "react";
import type { Story } from "@/lib/types";
import type { Language } from "@/lib/types";
import { assetUrl } from "@/lib/paths";
import { useLanguage } from "@/hooks/useLanguage";
import { usePersonalization } from "@/hooks/usePersonalization";

// Section headings used by the digest body, per language. Rendered with
// distinct styling so sections don't blur into one blob of text.
const SECTION_HEADINGS: Record<Language, string[]> = {
  "zh-TW": ["發生了什麼事", "為什麼重要", "來源異同", "仍不確定"],
  en: ["What happened", "Why it matters", "Sources agree / disagree", "Still uncertain"],
};

function renderBodySections(body: string, lang: Language) {
  const headings = new Set(SECTION_HEADINGS[lang]);
  const nodes: ReactNode[] = [];
  let key = 0;
  let seenHeading = false;
  for (const chunk of body.split(/\n\n+/)) {
    for (const rawLine of chunk.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      if (headings.has(line)) {
        // Distinct section heading: bold + divider line above (except first).
        nodes.push(
          <h3
            key={key++}
            className={`mb-2 text-lg font-bold text-slate-900 ${
              seenHeading ? "mt-7 border-t border-slate-200 pt-5" : ""
            }`}
          >
            {line}
          </h3>
        );
        seenHeading = true;
      } else {
        nodes.push(
          <p key={key++} className="mb-4 leading-7 text-slate-800 sm:leading-8">
            {line}
          </p>
        );
      }
    }
  }
  return nodes;
}

export default function StoryDetailClient({ story }: { story: Story }) {
  const { lang, setLang, ready: langReady } = useLanguage();
  const { state, ready, interact } = usePersonalization();

  useEffect(() => {
    if (story && ready) {
      interact(story, "open");
    }
    // record open once when ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, story?.id]);

  if (!ready || !langReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  const alt = story.imageAlt?.[lang] ?? story.title[lang];

  return (
    <div className="min-h-screen">
      <Header lang={lang} onLangChange={setLang} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-blue-700 hover:underline"
        >
          ← {lang === "zh-TW" ? "返回" : "Back"}
        </Link>

        {story.imageUrl && (
          <div className="relative mb-5 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
            <img
              src={assetUrl(story.imageUrl)}
              alt={alt}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {(story.isHeadline || story.isPopular) && (
              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                {story.isHeadline && (
                  <span className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
                    {lang === "zh-TW" ? "頭條" : "HEADLINE"}
                  </span>
                )}
                {story.isPopular && (
                  <span className="rounded-md bg-violet-600 px-2.5 py-1 text-xs font-bold text-white">
                    {lang === "zh-TW" ? "熱門" : "Popular"}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium">
            {CATEGORY_LABELS[story.category][lang]}
          </span>
          {story.isHeadline && (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
              {lang === "zh-TW" ? "頭條" : "HEADLINE"}
            </span>
          )}
          {story.isPopular && (
            <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-900">
              {lang === "zh-TW" ? "熱門" : "Popular"}
            </span>
          )}
          <TrustScoreBadge
            score={story.trustScore}
            lang={lang}
            sourceCount={story.sources.length}
            hasDisagreement={Boolean(story.disagreements)}
            titleText={story.title.en + " " + story.title["zh-TW"]}
            summaryText={
              story.summary.en +
              " " +
              story.summary["zh-TW"] +
              " " +
              story.body.en
            }
            category={story.category}
            sourceDomains={story.sources.map((s) => {
              try {
                return new URL(s.url).hostname;
              } catch {
                return s.name;
              }
            })}
          />
          <time className="text-xs text-slate-400">
            {new Date(story.publishedAt).toLocaleString(
              lang === "zh-TW" ? "zh-TW" : "en-US"
            )}
          </time>
        </div>

        <h1 className="mb-4 text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
          {story.title[lang]}
        </h1>

        <p className="mb-4 text-sm font-medium leading-relaxed text-slate-500">
          {story.summary[lang]}
        </p>

        <article className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {lang === "zh-TW" ? "Axiom 消化文" : "Axiom digest"}
          </h2>
          <div className="text-base text-slate-800 sm:text-[17px]">
            {renderBodySections(story.body[lang], lang)}
          </div>
        </article>

        {story.glossary && story.glossary.length > 0 && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {lang === "zh-TW" ? "背景／名詞解釋" : "Background / glossary"}
            </h2>
            <ul className="space-y-3">
              {story.glossary.map((entry, i) => (
                <li
                  key={`${entry.term.en}-${i}`}
                  className="text-sm leading-relaxed text-slate-700 sm:text-[15px]"
                >
                  <span className="font-semibold text-slate-900">
                    {entry.term[lang]}
                  </span>
                  <span className="text-slate-400"> — </span>
                  <span>{entry.blurb[lang]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mb-6">
          <InteractionButtons
            story={story}
            state={state}
            lang={lang}
            onSave={() => interact(story, "save")}
            onNotInterested={() => interact(story, "not_interested")}
          />
        </div>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            {lang === "zh-TW" ? "來源媒體" : "Source outlets"}
          </h2>
          <ul className="space-y-2">
            {story.sources.map((s) => (
              <li
                key={s.url + s.name}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-700 hover:underline"
                >
                  {s.name}
                </a>
                {s.stance && (
                  <p className="mt-0.5 text-xs text-slate-500">{s.stance}</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {story.disagreements && (
          <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="mb-1 text-sm font-semibold text-amber-900">
              {lang === "zh-TW" ? "來源分歧" : "Disagreements"}
            </h2>
            <p className="text-sm leading-relaxed text-amber-950">
              {story.disagreements[lang]}
            </p>
          </section>
        )}

        <TrustBreakdownPanel
          breakdown={story.trustBreakdown}
          score={story.trustScore}
          lang={lang}
        />

        <div className="mt-6 flex flex-wrap gap-1.5">
          {story.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
