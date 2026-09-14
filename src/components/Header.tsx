"use client";

import Link from "next/link";
import type { Language } from "@/lib/types";

interface HeaderProps {
  lang: Language;
  onLangChange: (l: Language) => void;
  adultOptIn: boolean;
}

export function Header({ lang, onLangChange, adultOptIn }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group">
          <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-700">
            Trust-digest
          </span>
          <span className="ml-2 hidden text-xs text-slate-500 sm:inline">
            {lang === "zh-TW" ? "多源驗證新聞摘要" : "Multi-source verified digest"}
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-md px-2 py-1 text-slate-700 hover:bg-slate-100"
          >
            {lang === "zh-TW" ? "首頁" : "Home"}
          </Link>
          {adultOptIn && (
            <Link
              href="/adult"
              className="rounded-md px-2 py-1 text-rose-700 hover:bg-rose-50"
            >
              {lang === "zh-TW" ? "限制級" : "Adult 18+"}
            </Link>
          )}
          <div className="ml-1 flex rounded-lg border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => onLangChange("zh-TW")}
              className={`rounded-md px-2 py-1 ${
                lang === "zh-TW"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              繁中
            </button>
            <button
              type="button"
              onClick={() => onLangChange("en")}
              className={`rounded-md px-2 py-1 ${
                lang === "en"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              EN
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
