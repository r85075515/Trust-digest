#!/usr/bin/env -S npx tsx
/**
 * Axiom 每日品質回歸檢查（自動化 QA 腳本）
 *
 * 把 Ray 定過的內容鐵律（2026-10-04）變成機器可驗的檢查項：
 * 成品卡必須是真正的 digest、glossary 3–8 個、disagreements 只寫真實衝突、
 * URL 只許出現在 sources[]、無 ingest boilerplate、章節結構固定。
 *
 * 用法（在 repo 根目錄執行）：
 *   npx tsx scripts/quality-check.ts [stories.json 路徑]
 * 預設讀 data/stories.json。
 *
 * 唯讀：只讀取資料檔，絕不寫入或修改。唯一寫出的是腳本同目錄的
 * quality-report.json（給 CI／人工複查用）。
 *
 * 結束碼：全部檢查通過 → 0；有任何 fail 項 → 1；輸入讀取失敗 → 2。
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// ---------------- 型別 ----------------

interface LocalText {
  en?: unknown;
  "zh-TW"?: unknown;
}

interface Story {
  id?: unknown;
  title?: LocalText;
  summary?: LocalText;
  body?: LocalText;
  sources?: unknown;
  disagreements?: unknown;
  glossary?: unknown;
  trustScore?: unknown;
  trustBreakdown?: Record<string, unknown>;
}

interface CheckResult {
  name: string;
  passed: number;
  failed: number;
  failedIds: string[];
  warnings: string[];
}

interface Report {
  checkedAt: string;
  total: number;
  checks: CheckResult[];
}

// ---------------- 小工具 ----------------

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const asText = (v: unknown): string => (typeof v === "string" ? v : "");

const storyId = (s: Story, i: number): string =>
  isNonEmptyString(s.id) ? (s.id as string) : `#${i}`;

/** title／summary／body 的中英六個文字欄 */
function textFields(s: Story): string[] {
  return [
    asText(s.title?.en),
    asText(s.title?.["zh-TW"]),
    asText(s.summary?.en),
    asText(s.summary?.["zh-TW"]),
    asText(s.body?.en),
    asText(s.body?.["zh-TW"]),
  ];
}

// ---------------- 檢查 1：無 boilerplate ----------------

const BOILERPLATE_PATTERNS = [
  "本文由 ai",
  "ai 抓取",
  "ai 生成",
  "ai 整理",
  "作為 ai",
  "作為一個 ai",
];

function checkNoBoilerplate(s: Story): boolean {
  const hay = textFields(s).join("\n").toLowerCase();
  return !BOILERPLATE_PATTERNS.some((p) => hay.includes(p));
}

// ---------------- 檢查 2：glossary 數量與欄位 ----------------

const GLOSSARY_FIELDS = ["en", "zh-TW"] as const;

function isLocalText(v: unknown): boolean {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return GLOSSARY_FIELDS.every((f) => isNonEmptyString(o[f]));
}

function checkGlossary(s: Story): boolean {
  const g = s.glossary;
  if (!Array.isArray(g)) return false;
  if (g.length < 3 || g.length > 8) return false;
  // 嵌套結構：{term: {en, "zh-TW"}, blurb: {en, "zh-TW"}}
  return g.every(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      isLocalText((e as Record<string, unknown>).term) &&
      isLocalText((e as Record<string, unknown>).blurb),
  );
}

// ---------------- 檢查 3：disagreements 語義 ----------------

function disagreementText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(disagreementText).join("\n");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return [o.en, o["zh-TW"], o.zh, o.text]
      .map(disagreementText)
      .join("\n");
  }
  return "";
}

/** 真實衝突的啟發式訊號：數字，或對比標記 */
const CONFLICT_SIGNALS: RegExp[] = [
  /\d/,
  /vs/i,
  /／/,
  /對/,
  /比/,
  /不同/,
  /差異/,
  /分歧/,
  /不一致/,
  /衝突/,
  /矛盾/,
];

function checkDisagreements(s: Story): boolean {
  const v = s.disagreements;
  if (v == null) return true; // 無分歧可報 → 通過
  const t = disagreementText(v).trim();
  if (t.length === 0) return false;
  const lower = t.toLowerCase();
  if (lower === "無" || lower === "无" || lower === "n/a" || lower === "none") {
    return false;
  }
  return CONFLICT_SIGNALS.some((re) => re.test(t));
}

// ---------------- 檢查 4：URL 位置 ----------------

const URL_MARKERS = ["http://", "https://", "www."];

function isValidHttpUrl(v: unknown): boolean {
  if (!isNonEmptyString(v)) return false;
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function checkUrlPlacement(s: Story): boolean {
  const hay = textFields(s).join("\n").toLowerCase();
  if (URL_MARKERS.some((m) => hay.includes(m))) return false;
  const srcs = s.sources;
  if (!Array.isArray(srcs) || srcs.length === 0) return false;
  return srcs.every(
    (src) =>
      typeof src === "object" &&
      src !== null &&
      isValidHttpUrl((src as Record<string, unknown>).url),
  );
}

// ---------------- 檢查 5：章節結構 ----------------

const CHAPTER_MARKERS = ["發生了什麼事", "為什麼重要", "來源異同", "仍不確定"];

function checkChapters(s: Story): boolean {
  const body = asText(s.body?.["zh-TW"]);
  return CHAPTER_MARKERS.every((m) => body.includes(m));
}

// ---------------- 檢查 6：雙語完整 ----------------

function checkBilingual(s: Story): boolean {
  if (!isNonEmptyString(s.title?.["zh-TW"])) return false;
  if (!isNonEmptyString(s.summary?.["zh-TW"])) return false;
  if (!isNonEmptyString(s.body?.["zh-TW"])) return false;
  if (!isNonEmptyString(s.title?.en)) return false;
  if (!isNonEmptyString(s.summary?.en)) return false;
  const words = asText(s.body?.en).trim().split(/\s+/).filter(Boolean);
  return words.length >= 100;
}

// ---------------- 檢查 7：信任分範圍 ----------------

const TRUST_FACTORS = [
  "sourceDiversity",
  "outletReputation",
  "crossCorroboration",
  "recencyClarity",
] as const;

function checkTrustRange(s: Story): boolean {
  const score = s.trustScore;
  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    return false;
  }
  const bd = s.trustBreakdown;
  if (typeof bd !== "object" || bd === null) return false;
  return TRUST_FACTORS.every((f) => {
    const v = (bd as Record<string, unknown>)[f];
    return (
      typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 25
    );
  });
}

// ---------------- 檢查 8：caps 抽查（只記 warning，不計 fail） ----------------

const DEATH_ZH = ["死亡", "身亡", "喪生"];
const DEATH_LATIN = /\b(died|killed|death|deaths)\b/i;
const RUMOR_ZH = ["謠傳", "未證實"];
const RUMOR_LATIN = /\brumou?rs?\b/i;

function capsWarnings(s: Story, id: string): string[] {
  const warnings: string[] = [];
  const score = s.trustScore;
  if (typeof score !== "number" || !Number.isFinite(score)) return warnings;
  const text = `${asText(s.body?.en)}\n${asText(s.body?.["zh-TW"])}`;
  const hasDeath =
    DEATH_ZH.some((k) => text.includes(k)) || DEATH_LATIN.test(text);
  const hasRumor =
    RUMOR_ZH.some((k) => text.includes(k)) || RUMOR_LATIN.test(text);
  if (hasDeath && score > 55) {
    warnings.push(
      `${id}: 內文含死亡／傷亡關鍵字，但 trustScore=${score} > 55`,
    );
  }
  if (hasRumor && score > 55) {
    warnings.push(
      `${id}: 內文含謠傳／未證實標記，但 trustScore=${score} > 55`,
    );
  }
  return warnings;
}

// ---------------- 檢查清單 ----------------

interface BoolCheck {
  name: string;
  run: (s: Story) => boolean;
}

const BOOL_CHECKS: BoolCheck[] = [
  { name: "無 boilerplate", run: checkNoBoilerplate },
  { name: "glossary 數量與欄位", run: checkGlossary },
  { name: "disagreements 語義", run: checkDisagreements },
  { name: "URL 位置", run: checkUrlPlacement },
  { name: "章節結構", run: checkChapters },
  { name: "雙語完整", run: checkBilingual },
  { name: "信任分範圍", run: checkTrustRange },
];

const CAPS_CHECK_NAME = "caps 抽查（傷亡／謠傳關鍵字，warning only）";

// ---------------- 輸入 ----------------

function loadStories(path: string): Story[] {
  const raw = readFileSync(path, "utf-8");
  const data: unknown = JSON.parse(raw);
  if (Array.isArray(data)) return data as Story[];
  if (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as Record<string, unknown>).stories)
  ) {
    return (data as { stories: Story[] }).stories;
  }
  throw new Error(`無法解析 stories：${path}（需要陣列或 {stories: [...]}）`);
}

// ---------------- 主流程 ----------------

function main(): void {
  const inputPath = resolve(process.argv[2] ?? "data/stories.json");

  let stories: Story[];
  try {
    stories = loadStories(inputPath);
  } catch (err) {
    console.error(
      `讀取輸入失敗：${inputPath} — ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(2);
  }

  const results: CheckResult[] = BOOL_CHECKS.map((c) => ({
    name: c.name,
    passed: 0,
    failed: 0,
    failedIds: [],
    warnings: [],
  }));
  const caps: CheckResult = {
    name: CAPS_CHECK_NAME,
    passed: stories.length,
    failed: 0,
    failedIds: [],
    warnings: [],
  };

  stories.forEach((s, i) => {
    const id = storyId(s, i);
    BOOL_CHECKS.forEach((c, ci) => {
      let ok = false;
      try {
        ok = c.run(s);
      } catch {
        ok = false; // 卡片結構異常 → 視為沒過，不讓整批崩掉
      }
      if (ok) {
        results[ci].passed += 1;
      } else {
        results[ci].failed += 1;
        results[ci].failedIds.push(id);
      }
    });
    caps.warnings.push(...capsWarnings(s, id));
  });
  results.push(caps);

  // Console 輸出
  for (const r of results) {
    const mark = r.failed === 0 ? "✓" : "✗";
    console.log(`${mark} ${r.name} (通過 ${r.passed}/${stories.length} 張)`);
    if (r.failedIds.length > 0) {
      console.log(`  未過: ${r.failedIds.join(", ")}`);
    }
  }
  const allWarnings = results.flatMap((r) => r.warnings);
  if (allWarnings.length > 0) {
    console.log("");
    console.log(`⚠ 警告 (${allWarnings.length})：`);
    for (const w of allWarnings) {
      console.log(`  - ${w}`);
    }
  }

  const failedChecks = results.filter((r) => r.failed > 0);
  console.log("");
  if (failedChecks.length === 0) {
    console.log("QUALITY: PASS");
  } else {
    console.log(`QUALITY: FAIL (${failedChecks.length} 項)`);
  }

  // quality-report.json（寫在腳本同目錄，絕不碰資料檔）
  // 用 argv[1] 而非 import.meta：CJS／ESM 專案下 tsc 都能過
  const scriptDir = dirname(resolve(process.argv[1] ?? "scripts/quality-check.ts"));
  const report: Report = {
    checkedAt: new Date().toISOString(),
    total: stories.length,
    checks: results,
  };
  writeFileSync(
    resolve(scriptDir, "quality-report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf-8",
  );

  process.exit(failedChecks.length === 0 ? 0 : 1);
}

main();
