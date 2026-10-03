/**
 * Unit dry-run: celebrity fake-death rumor trust path.
 * Run: npx tsx scripts/test-celebrity-death-hoax.ts
 * No network / no LLM.
 */
import assert from "node:assert/strict";
import {
  applyTrustCaps,
  classifyCelebrityDeathRumor,
  countMainstreamObituaryPublishers,
  honestyKind,
  honestyLabel,
  isCelebrityLikeLane,
  isCommunityHeatDomain,
  isDeathDebunkText,
  isDeathRumorText,
  isMainstreamObituaryDomain,
  DEATH_RUMOR_UNCONFIRMED_CAP,
  CASUALTY_SCORE_CAP,
} from "../src/lib/trust";
import {
  cleanHeatTitle,
  deathRumorHeatToFeedItems,
  isDeathRumorHeatTitle,
  type HeatCandidate,
} from "../src/lib/heat-discovery";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}`);
    throw e;
  }
}

console.log("celebrity death-hoax unit tests\n");

check("detects EN death-rumor signals (pattern, no person hardcode)", () => {
  assert.equal(isDeathRumorText("Actor rumored dead — RIP posts go viral"), true);
  assert.equal(isDeathRumorText("obituary circulating on forums"), true);
  assert.equal(isDeathRumorText("pop star dies at 42 claims social media"), true);
  assert.equal(isDeathRumorText("new album chart update"), false);
});

check("detects ZH death-rumor signals", () => {
  assert.equal(isDeathRumorText("網傳男星英年早逝 粉絲哭崩"), true);
  assert.equal(isDeathRumorText("藝人去世消息瘋傳"), true);
  assert.equal(isDeathRumorText("分手復合緋聞"), false);
});

check("detects debunk / alive language", () => {
  assert.equal(isDeathDebunkText("Death hoax: star is alive and filming"), true);
  assert.equal(isDeathDebunkText("打臉死亡謠言 男星健在復工"), true);
  assert.equal(isDeathDebunkText("obituary published by family"), false);
});

check("mainstream obituary domains vs community heat", () => {
  assert.equal(isMainstreamObituaryDomain("bbc.com"), true);
  assert.equal(isMainstreamObituaryDomain("www.reuters.com"), true);
  assert.equal(isMainstreamObituaryDomain("billboard.com"), true);
  assert.equal(isMainstreamObituaryDomain("ptt.cc"), false);
  assert.equal(isMainstreamObituaryDomain("dcard.tw"), false);
  assert.equal(isCommunityHeatDomain("ptt.cc"), true);
  assert.equal(countMainstreamObituaryPublishers(["bbc.com", "reuters.com", "ptt.cc"]), 2);
});

check("celebrity-like lane: gossip categories + lexicon", () => {
  assert.equal(isCelebrityLikeLane("eastAsiaGossip", "random"), true);
  assert.equal(isCelebrityLikeLane("entertainment", "random"), true);
  assert.equal(isCelebrityLikeLane("international", "actor found dead rumor"), true);
  assert.equal(isCelebrityLikeLane("finance", "rate hike"), false);
});

check("path: community heat, no mainstream obits → unconfirmed_rumor", () => {
  const path = classifyCelebrityDeathRumor({
    category: "eastAsiaGossip",
    texts: ["網傳男星去世 粉絲淚崩", "據傳英年早逝"],
    domains: ["ptt.cc", "dcard.tw"],
    hasCommunityHeat: true,
  });
  assert.equal(path, "unconfirmed_rumor");
  const kind = honestyKind({ sourceCount: 2, deathPath: path });
  assert.equal(kind, "cautious");
  assert.equal(honestyLabel(kind, 2, "zh-TW"), "審慎");
  assert.equal(honestyLabel("unconfirmed", 1, "zh-TW"), "未確認");
  const capped = applyTrustCaps(80, { deathPath: path });
  assert.ok(capped <= DEATH_RUMOR_UNCONFIRMED_CAP);
  assert.ok(capped < 75, "never high trust");
});

check("path: ≥2 mainstream obituaries → confirmed_obituary (capped)", () => {
  const path = classifyCelebrityDeathRumor({
    category: "entertainment",
    texts: ["Singer dies at 70 — obituaries"],
    domains: ["bbc.com", "reuters.com", "nytimes.com"],
  });
  assert.equal(path, "confirmed_obituary");
  const kind = honestyKind({ sourceCount: 3, deathPath: path });
  assert.equal(kind, "multi_agree");
  assert.equal(honestyLabel(kind, 3, "zh-TW"), "3源一致");
  const capped = applyTrustCaps(90, { deathPath: path });
  assert.equal(capped, CASUALTY_SCORE_CAP);
});

check("path: mainstream says alive / hoax → debunk (打臉)", () => {
  const path = classifyCelebrityDeathRumor({
    category: "entertainment",
    texts: [
      "Death hoax debunked: celebrity alive and back to work",
      "RIP rumor viral but star denies death",
    ],
    domains: ["bbc.com", "billboard.com"],
  });
  assert.equal(path, "debunked");
  const kind = honestyKind({ sourceCount: 2, deathPath: path });
  assert.equal(kind, "debunk");
  assert.equal(honestyLabel(kind, 2, "zh-TW"), "多源打臉");
  assert.equal(honestyLabel(kind, 1, "zh-TW"), "打臉");
});

check("path: mixed death+alive without mainstream → disputed", () => {
  const path = classifyCelebrityDeathRumor({
    category: "eastAsiaGossip",
    texts: ["網傳去世", "也有人說還活著 假死謠言"],
    domains: ["ptt.cc"],
    hasCommunityHeat: true,
  });
  assert.equal(path, "disputed");
  assert.equal(honestyKind({ sourceCount: 1, deathPath: path }), "disagree");
  assert.equal(honestyLabel("disagree", 1, "zh-TW"), "敘述有分歧");
});

check("non-celebrity death does not take celeb path", () => {
  const path = classifyCelebrityDeathRumor({
    category: "international",
    texts: ["Flood deaths rise to 40 in coastal town"],
    domains: ["bbc.com", "reuters.com"],
  });
  assert.equal(path, null);
});

check("no person-name hardcode: Gaten/Matarazzo absent from trust module", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const src = fs.readFileSync("src/lib/trust.ts", "utf8");
  assert.equal(/gaten|matarazzo|stranger things/i.test(src), false);
});

check("heat: death-rumor unverified → feed items for card eligibility", () => {
  const heat: HeatCandidate[] = [
    { title: "[問卦] 網傳某藝人去世是真的嗎", source: "ptt", board: "Gossiping" },
    { title: "分手生小孩", source: "ptt", board: "Gossiping" },
    {
      title: "Actor death hoax RIP trending",
      source: "line-today",
      url: "https://today.line.me/tw/v2/article/x",
    },
  ];
  assert.equal(isDeathRumorHeatTitle(cleanHeatTitle(heat[0].title)), true);
  const items = deathRumorHeatToFeedItems(heat, { max: 5 });
  assert.ok(items.length >= 1);
  assert.ok(items.every((i) => i.feedId.startsWith("heat-death-rumor-")));
  assert.ok(items.every((i) => i.category === "eastAsiaGossip"));
  assert.ok(items.some((i) => i.domain === "ptt.cc"));
  // breakup-only title must not be injected
  assert.equal(
    items.some((i) => i.title.includes("分手生小孩")),
    false
  );
});

console.log(`\n${passed} checks passed`);
