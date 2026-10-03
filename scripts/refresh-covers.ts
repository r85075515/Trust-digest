/**
 * Re-fetch covers for specific story IDs only (no digest / LLM).
 * Usage: npx tsx scripts/refresh-covers.ts [storyId ...]
 * Default: Taylor Swift sample + up to 2 others missing/local covers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveStoryCover, isJunkImageUrl } from "../src/lib/cover";
import type { Story } from "../src/lib/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORIES_PATH = path.join(ROOT, "data", "stories.json");
const COVER_DIR = path.join(ROOT, "public", "covers", "live");
const USER_AGENT =
  "AxiomDigest/0.1 (+https://github.com/; educational multi-source news digest; summarize+link only)";

async function downloadCover(
  imageUrl: string,
  storyId: string
): Promise<string | undefined> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return undefined;
    const ctype = res.headers.get("content-type") || "";
    if (!/image\//i.test(ctype) && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(imageUrl)) {
      return undefined;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500 || buf.length > 2_500_000) return undefined;
    let ext = "jpg";
    if (/png/i.test(ctype) || imageUrl.includes(".png")) ext = "png";
    else if (/webp/i.test(ctype) || imageUrl.includes(".webp")) ext = "webp";
    else if (/gif/i.test(ctype)) ext = "gif";
    fs.mkdirSync(COVER_DIR, { recursive: true });
    const filename = `${storyId}.${ext}`;
    fs.writeFileSync(path.join(COVER_DIR, filename), buf);
    return `/covers/live/${filename}`;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const stories = JSON.parse(fs.readFileSync(STORIES_PATH, "utf8")) as Story[];
  const argIds = process.argv.slice(2).filter((a) => !a.startsWith("-"));

  let targets: Story[];
  if (argIds.length) {
    targets = stories.filter((s) => argIds.includes(s.id));
  } else {
    const swift = stories.find((s) => /taylor-swift|swift|kelce/i.test(s.id + s.title.en));
    const extras = stories
      .filter((s) => s !== swift && s.sources?.[0]?.url)
      .slice(0, 2);
    targets = [swift, ...extras].filter(Boolean) as Story[];
  }

  if (!targets.length) {
    console.error("[refresh-covers] no matching stories");
    process.exit(1);
  }

  const report: Array<Record<string, string | undefined>> = [];

  for (const story of targets) {
    const articleUrl = story.sources?.[0]?.url;
    console.info(`[refresh-covers] ${story.id}`);
    console.info(`  title: ${story.title.en.slice(0, 80)}`);
    console.info(`  article: ${articleUrl}`);
    console.info(`  old: ${story.imageUrl}`);

    const resolved = await resolveStoryCover({
      articleUrl,
      feedImageUrl:
        story.imageUrl && /^https:\/\//i.test(story.imageUrl)
          ? story.imageUrl
          : undefined,
      feedImageFromMedia: false,
    });

    if (!resolved || isJunkImageUrl(resolved)) {
      console.warn(`  FAIL: no article-bound cover`);
      report.push({
        id: story.id,
        status: "fail",
        old: story.imageUrl,
      });
      continue;
    }

    const local = await downloadCover(resolved, story.id);
    const next = local || resolved;
    story.imageUrl = next;
    if (!story.imageAlt) {
      story.imageAlt = {
        en: `Cover related to: ${story.title.en}`,
        "zh-TW": `相關封面圖：${story.title["zh-TW"]}`,
      };
    }
    console.info(`  new remote: ${resolved}`);
    console.info(`  new local: ${next}`);
    report.push({
      id: story.id,
      status: "ok",
      remote: resolved,
      local: next,
      old: undefined,
    });
  }

  fs.writeFileSync(STORIES_PATH, JSON.stringify(stories, null, 2) + "\n", "utf8");
  console.info("[refresh-covers] wrote stories.json");
  console.info(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
