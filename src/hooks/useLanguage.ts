"use client";

import { useCallback, useEffect, useState } from "react";
import type { Language } from "@/lib/types";

const KEY = "trust-digest-lang";

export function useLanguage() {
  const [lang, setLangState] = useState<Language>("zh-TW");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Language | null;
    if (stored === "en" || stored === "zh-TW") setLangState(stored);
    setReady(true);
  }, []);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem(KEY, l);
  }, []);

  const t = useCallback(
    (text: { "zh-TW": string; en: string }) => text[lang],
    [lang]
  );

  return { lang, setLang, t, ready };
}
