/**
 * Live RSS / Atom ingest helpers for Axiom.
 * Summarize + link only — never republish full articles.
 */

import type { Category, EastAsiaRegion, Story, TrustBreakdown } from "./types";
import { computeTrustScore } from "./trust";

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: Category;
  language: "zh-TW" | "en" | "mixed";
  domain: string;
  /** Regional tag for eastAsiaGossip feeds */
  region?: EastAsiaRegion;
}

/**
 * Curated allow-list (verified HTTP 200).
 * Entertainment = hot verifiable celebrity gossip (標驗證／多源) — NOT Broadway reviews or film-festival academia.
 * Society feeds remapped to international; beauty skipped. Main chips: intl/finance/tech/AI/Western gossip/East Asia gossip.
 */
export const ALLOWED_FEEDS: FeedSource[] = [
  // International
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    category: "international",
    language: "en",
    domain: "bbc.com",
  },
  {
    id: "npr-world",
    name: "NPR World",
    url: "https://feeds.npr.org/1004/rss.xml",
    category: "international",
    language: "en",
    domain: "npr.org",
  },
  {
    id: "guardian-world",
    name: "The Guardian World",
    url: "https://www.theguardian.com/world/rss",
    category: "international",
    language: "en",
    domain: "theguardian.com",
  },
  {
    id: "nyt-world",
    name: "NYT World",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    category: "international",
    language: "en",
    domain: "nytimes.com",
  },
  // Finance
  {
    id: "cnbc-top",
    name: "CNBC",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    category: "finance",
    language: "en",
    domain: "cnbc.com",
  },
  {
    id: "marketwatch",
    name: "MarketWatch",
    url: "https://www.marketwatch.com/rss/topstories",
    category: "finance",
    language: "en",
    domain: "marketwatch.com",
  },
  {
    id: "yahoo-finance",
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
    category: "finance",
    language: "en",
    domain: "finance.yahoo.com",
  },
  {
    id: "bbc-business",
    name: "BBC Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    category: "finance",
    language: "en",
    domain: "bbc.com",
  },
  {
    id: "guardian-business",
    name: "The Guardian Business",
    url: "https://www.theguardian.com/business/rss",
    category: "finance",
    language: "en",
    domain: "theguardian.com",
  },
  // Tech
  {
    id: "techcrunch",
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    category: "tech",
    language: "en",
    domain: "techcrunch.com",
  },
  {
    id: "theverge",
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    category: "tech",
    language: "en",
    domain: "theverge.com",
  },
  {
    id: "bbc-tech",
    name: "BBC Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    category: "tech",
    language: "en",
    domain: "bbc.com",
  },
  {
    id: "arstechnica",
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    category: "tech",
    language: "en",
    domain: "arstechnica.com",
  },
  {
    id: "engadget",
    name: "Engadget",
    url: "https://www.engadget.com/rss.xml",
    category: "tech",
    language: "en",
    domain: "engadget.com",
  },
  // AI
  {
    id: "mit-ai",
    name: "MIT News AI",
    url: "https://news.mit.edu/rss/topic/artificial-intelligence2",
    category: "ai",
    language: "en",
    domain: "news.mit.edu",
  },
  {
    id: "wired-ai",
    name: "Wired AI",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    category: "ai",
    language: "en",
    domain: "wired.com",
  },
  {
    id: "sciencedaily-ai",
    name: "ScienceDaily AI",
    url: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml",
    category: "ai",
    language: "en",
    domain: "sciencedaily.com",
  },
  {
    id: "google-ai-blog",
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
    category: "ai",
    language: "en",
    domain: "blog.google",
  },
  // Entertainment — Western/global verifiable celebrity gossip (NOT East Asia lane)
  {
    id: "billboard",
    name: "Billboard",
    url: "https://www.billboard.com/feed/",
    category: "entertainment",
    language: "en",
    domain: "billboard.com",
  },
  {
    id: "rollingstone-music",
    name: "Rolling Stone Music",
    url: "https://www.rollingstone.com/music/music-news/feed/",
    category: "entertainment",
    language: "en",
    domain: "rollingstone.com",
  },
  {
    id: "tmz",
    name: "TMZ",
    url: "https://www.tmz.com/rss.xml",
    category: "entertainment",
    language: "en",
    domain: "tmz.com",
  },
  {
    id: "hollywood-life",
    name: "Hollywood Life",
    url: "https://hollywoodlife.com/feed/",
    category: "entertainment",
    language: "en",
    domain: "hollywoodlife.com",
  },
  {
    id: "just-jared",
    name: "Just Jared",
    url: "https://www.justjared.com/feed/",
    category: "entertainment",
    language: "en",
    domain: "justjared.com",
  },
  {
    id: "et-online",
    name: "ET Online",
    url: "https://www.etonline.com/news/rss",
    category: "entertainment",
    language: "en",
    domain: "etonline.com",
  },
  {
    id: "bbc-entertainment",
    name: "BBC Entertainment",
    url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    category: "entertainment",
    language: "en",
    domain: "bbc.com",
  },
  // East Asia gossip — TW colony heat-first, then JP/KR/CN (soft-deprioritized in ingest caps)
  // Heat discovery (PTT / GNews-Dcard / LINE) lives in heat-discovery.ts — backlog: Threads, X, native Dcard API.
  {
    id: "ettoday-star",
    name: "ETtoday 影劇",
    url: "https://feeds.feedburner.com/ettoday/star",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "ettoday.net",
    region: "tw",
  },
  {
    id: "gnews-tw-ent",
    name: "Google News TW Entertainment",
    url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "news.google.com",
    region: "tw",
  },
  {
    id: "ettoday-fashion",
    name: "ETtoday 時尚",
    url: "https://feeds.feedburner.com/ettoday/fashion",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "ettoday.net",
    region: "tw",
  },
  {
    id: "yahoo-tw-ent",
    name: "Yahoo TW 娛樂",
    url: "https://tw.news.yahoo.com/rss/entertainment",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "tw.news.yahoo.com",
    region: "tw",
  },
  {
    id: "gnews-tw-yule",
    name: "Google News TW 娛樂",
    url: "https://news.google.com/rss/search?q=%E5%A8%9B%E6%A8%82&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "news.google.com",
    region: "tw",
  },
  {
    id: "gnews-tw-ettoday-breakup",
    name: "GNews site:ettoday 分手/復合/婚",
    url: "https://news.google.com/rss/search?q=site:ettoday.net+%28%E5%88%86%E6%89%8B+OR+%E5%BE%A9%E5%90%88+OR+%E5%A9%9A%29&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "ettoday.net",
    region: "tw",
  },
  {
    id: "gnews-tw-setn-breakup",
    name: "GNews site:setn 分手/婚",
    url: "https://news.google.com/rss/search?q=site:setn.com+%28%E5%88%86%E6%89%8B+OR+%E5%A9%9A%29&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "setn.com",
    region: "tw",
  },
  {
    id: "gnews-tw-breakup-star",
    name: "GNews TW 分手+藝人/明星",
    url: "https://news.google.com/rss/search?q=%E5%88%86%E6%89%8B+%28%E8%97%9D%E4%BA%BA+OR+%E6%98%8E%E6%98%9F%29&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "news.google.com",
    region: "tw",
  },
  {
    id: "gnews-tw-reunion-star",
    name: "GNews TW 復合+藝人/明星",
    url: "https://news.google.com/rss/search?q=%E5%BE%A9%E5%90%88+%28%E8%97%9D%E4%BA%BA+OR+%E6%98%8E%E6%98%9F%29&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "news.google.com",
    region: "tw",
  },
  {
    id: "gnews-tw-divorce-star",
    name: "GNews TW 婚變/離婚+藝人",
    url: "https://news.google.com/rss/search?q=%28%E5%A9%9A%E8%AE%8A+OR+%E9%9B%A2%E5%A9%9A%29+%28%E8%97%9D%E4%BA%BA+OR+%E6%98%8E%E6%98%9F%29&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "news.google.com",
    region: "tw",
  },
  {
    id: "gnews-tw-dcard-proxy",
    name: "GNews Dcard 娛樂 heat proxy",
    url: "https://news.google.com/rss/search?q=site:dcard.tw+%E5%A8%9B%E6%A8%82&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "dcard.tw",
    region: "tw",
  },
  {
    id: "gnews-tw-line-ent",
    name: "GNews LINE TODAY TW 娛樂",
    url: "https://news.google.com/rss/search?q=site:today.line.me/tw+%E5%A8%9B%E6%A8%82&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    category: "eastAsiaGossip",
    language: "zh-TW",
    domain: "today.line.me",
    region: "tw",
  },
  {
    id: "gnews-jp-ent",
    name: "Google News JP 娛樂/明星",
    url: "https://news.google.com/rss/search?q=%E5%A8%9B%E6%A8%82+OR+%E6%98%8E%E6%98%9F&hl=ja&gl=JP&ceid=JP:ja",
    category: "eastAsiaGossip",
    language: "mixed",
    domain: "news.google.com",
    region: "jp",
  },
  {
    id: "soompi",
    name: "Soompi",
    url: "https://www.soompi.com/feed",
    category: "eastAsiaGossip",
    language: "en",
    domain: "soompi.com",
    region: "kr",
  },
  {
    id: "gnews-kr-kpop",
    name: "Google News KR K-pop/연예",
    url: "https://news.google.com/rss/search?q=K-pop+OR+%EC%97%B0%EC%98%88&hl=ko&gl=KR&ceid=KR:ko",
    category: "eastAsiaGossip",
    language: "mixed",
    domain: "news.google.com",
    region: "kr",
  },
  {
    id: "koreaboo",
    name: "Koreaboo",
    url: "https://www.koreaboo.com/feed",
    category: "eastAsiaGossip",
    language: "en",
    domain: "koreaboo.com",
    region: "kr",
  },
  {
    id: "sina-ent-hot",
    name: "新浪娛樂熱滾",
    url: "https://rss.sina.com.cn/ent/hot_roll.xml",
    category: "eastAsiaGossip",
    language: "mixed",
    domain: "sina.com.cn",
    region: "cn",
  },
  {
    id: "sina-ent-all",
    name: "新浪娛樂全新聞",
    url: "https://rss.sina.com.cn/news/allnews/ent.xml",
    category: "eastAsiaGossip",
    language: "mixed",
    domain: "sina.com.cn",
    region: "cn",
  },
  {
    id: "gnews-cn-ent",
    name: "Google News CN 娱乐明星",
    url: "https://news.google.com/rss/search?q=%E5%A8%B1%E4%B9%90+%E6%98%8E%E6%98%9F&hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
    category: "eastAsiaGossip",
    language: "mixed",
    domain: "news.google.com",
    region: "cn",
  },
  // Society — crime, accidents, public safety, civic incidents
  {
    id: "cbs-crime",
    name: "CBS News Crime",
    url: "https://www.cbsnews.com/latest/rss/crime",
    category: "society",
    language: "en",
    domain: "cbsnews.com",
  },
  {
    id: "sky-uk",
    name: "Sky News UK",
    url: "https://feeds.skynews.com/feeds/rss/uk.xml",
    category: "society",
    language: "en",
    domain: "news.sky.com",
  },
  {
    id: "bbc-uk",
    name: "BBC UK",
    url: "https://feeds.bbci.co.uk/news/uk/rss.xml",
    category: "society",
    language: "en",
    domain: "bbc.com",
  },
  {
    id: "latimes-california",
    name: "LA Times California",
    url: "https://www.latimes.com/california/rss2.0.xml",
    category: "society",
    language: "en",
    domain: "latimes.com",
  },
  {
    id: "guardian-uk-news",
    name: "The Guardian UK News",
    url: "https://www.theguardian.com/uk-news/rss",
    category: "society",
    language: "en",
    domain: "theguardian.com",
  },
  {
    id: "npr-news",
    name: "NPR News",
    url: "https://feeds.npr.org/1001/rss.xml",
    category: "society",
    language: "en",
    domain: "npr.org",
  },
  // Beauty
  {
    id: "allure",
    name: "Allure",
    url: "https://www.allure.com/feed/rss",
    category: "beauty",
    language: "en",
    domain: "allure.com",
  },
  {
    id: "fashionista",
    name: "Fashionista",
    url: "https://fashionista.com/.rss/full/",
    category: "beauty",
    language: "en",
    domain: "fashionista.com",
  },
];

/** Domain → reputation prior (0–25). Heuristic only. */
export const OUTLET_REPUTATION: Record<string, number> = {
  "bbc.com": 24,
  "bbci.co.uk": 24,
  "reuters.com": 25,
  "apnews.com": 25,
  "npr.org": 23,
  "nytimes.com": 22,
  "theguardian.com": 21,
  "washingtonpost.com": 21,
  "ft.com": 22,
  "wsj.com": 22,
  "cnbc.com": 19,
  "marketwatch.com": 18,
  "finance.yahoo.com": 16,
  "yahoo.com": 15,
  "bloomberg.com": 22,
  "techcrunch.com": 18,
  "theverge.com": 17,
  "arstechnica.com": 19,
  "engadget.com": 16,
  "wired.com": 18,
  "news.mit.edu": 23,
  "mit.edu": 23,
  "sciencedaily.com": 17,
  "blog.google": 18,
  "openai.com": 16,
  "billboard.com": 16,
  "rollingstone.com": 17,
  "soompi.com": 14,
  "koreaboo.com": 10,
  "ettoday.net": 13,
  "sina.com.cn": 12,
  "sina.com": 12,
  "news.google.com": 12,
  "tmz.com": 12,
  "hollywoodlife.com": 12,
  "justjared.com": 12,
  "etonline.com": 14,
  "cbsnews.com": 20,
  "news.sky.com": 18,
  "sky.com": 18,
  "latimes.com": 19,
  "allure.com": 15,
  "fashionista.com": 14,
  "nasa.gov": 22,
};

export const USER_AGENT =
  "AxiomDigest/0.1 (+https://github.com/; educational multi-source news digest; summarize+link only)";

export interface RawFeedItem {
  feedId: string;
  outletName: string;
  domain: string;
  category: Category;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  imageUrl?: string;
  /** True when imageUrl came from enclosure / media:* (item-tied), not HTML scrape. */
  imageFromMedia?: boolean;
  region?: EastAsiaRegion;
}

export interface StoryCluster {
  category: Category;
  members: RawFeedItem[];
  primaryTitle: string;
  bestImage?: string;
  publishedAt: string;
  disagreementHint: string | null;
  region?: EastAsiaRegion;
}

const STOP = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "can", "this", "that", "these", "those",
  "it", "its", "they", "them", "their", "he", "she", "his", "her", "we", "our",
  "you", "your", "i", "my", "not", "no", "yes", "after", "before", "over",
  "under", "into", "about", "up", "out", "off", "than", "then", "so", "if",
  "how", "what", "when", "where", "who", "which", "why", "new", "says", "say",
  "said", "report", "reports", "amid", "via", "per", "vs", "vs.",
]);

/** Celebrity / pop-culture signals (K-pop, J-pop, Hollywood, TW/HK/CN idols). */
const ENTERTAINMENT_POSITIVE = [
  "k-pop", "kpop", "j-pop", "jpop", "blackpink", "twice comeback", "twice drops", "girl group twice", "k-pop group twice", "stray kids",
  "aespa", "newjeans", "seventeen", "black pink",
  "jennie", "rosé", "jisoo", "jungkook", "taylor swift", "beyoncé",
  "beyonce", "lady gaga", "drake", "rihanna", "ariana grande", "billie eilish",
  "hollywood", "celebrity", "celebrities", "celeb", "k-pop idol", "idol group",
  "new album", "debut album", "grammy", "oscars", "emmys", "emmy awards",
  "red carpet", "paparazzi", "box office", "comeback stage",
  "music video", "billboard hot", "concert tour", "world tour",
  "welcomes baby", "baby with", "showbiz", "gossip", "tmz",
  "pop star", "pop singer", "rapper", "actress", "movie star",
  "le sserafim", "riize", "enhypen", "ateez", "g-dragon",
  "jay chou", "jj lin", "tfboys", "xiao zhan", "wang yibo",
  "akb48", "hikaru utada", "yoasobi", "soompi", "koreaboo",
  "sydney sweeney", "hayden panettiere", "walking dead", "netflix series",
  "charli xcx", "my chemical romance", "gerard way", "carrie underwood",
  "jeongyeon", "yunjin", "jungkook", "diljit dosanjh"];

/** East Asia celeb / gossip signals (TW·JP·KR·CN) — route to eastAsiaGossip. */
const EAST_ASIA_GOSSIP_POSITIVE = [
  "k-pop", "kpop", "j-pop", "jpop", "blackpink", "stray kids",
  "aespa", "newjeans", "seventeen", "le sserafim", "riize", "enhypen", "ateez",
  "g-dragon", "jeongyeon", "aespa",
  "jay chou", "jj lin", "tfboys", "xiao zhan", "wang yibo",
  "akb48", "hikaru utada", "yoasobi", "soompi", "koreaboo", "soompi",
  "影劇", "娛樂圈", "娱乐圈", "八卦", "緋聞", "绯闻", "偶像", "藝人", "艺人",
  "男星", "女星", "韓星", "韩星", "日星", "台星", "陸星", "陆星",
  "演藝", "演艺", "綜藝", "综艺", "戲劇", "戏剧", "追劇", "追剧",
  "網紅", "分手", "婚變", "復合", "直播", "對質", "全星", "影劇",
  "연예", "아이돌", "엔터테인먼트", "엔터",
  "芸能", "アイドル", "俳優", "女優", "ジャニーズ",
  "周杰倫", "周杰伦", "林俊傑", "林俊杰", "蔡依林", "鄧紫棋", "邓紫棋",
  "肖戰", "肖战", "王一博", "楊冪", "杨幂", "趙麗穎", "赵丽颖"];

/** Short Latin tokens that must use word boundaries (avoid "ive" in "exclusive"). */
const EAST_ASIA_GOSSIP_BOUNDED = ["blackpink", "newjeans", "stray kids", "enhypen", "ateez", "le sserafim", "aespa", "soompi", "koreaboo"];

const EAST_ASIA_STRONG_RE =
  /k-?pop|j-?pop|soompi|koreaboo|soompi|影劇|娛樂圈|娱乐圈|八卦|緋聞|绯闻|網紅|分手|婚變|復合|直播|對質|全星|연예|芸能|アイドル|韓星|韩星|台星|陸星|陆星|周杰|肖戰|肖战|王一博|stray kids|blackpink|newjeans|enhypen|ateez|le sserafim|inkigayo|music bank|mcountdown|(?:\\bk-?pop\\b.*\\b(?:exo|nct|ive|twice|bts|itzy)\\b)|(?:\\b(?:exo|nct|ive|twice|bts|itzy)\\b.*\\bk-?pop\\b)/i;

function eastAsiaGossipSignal(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (EAST_ASIA_STRONG_RE.test(raw)) return true;
  // CJK / Hangul / Kana gossip lexicon
  if (EAST_ASIA_GOSSIP_POSITIVE.some((k) => /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(k) && raw.includes(k))) {
    return true;
  }
  // Latin K-pop / outlet phrases (word-boundary via includesAny)
  if (includesAny(lower, EAST_ASIA_GOSSIP_BOUNDED)) return true;
  if (includesAny(lower, ["k-pop", "kpop", "j-pop", "jpop", "blackpink", "stray kids", "soompi", "koreaboo", "newjeans", "enhypen", "le sserafim"])) {
    return true;
  }
  return false;
}

/** Wrong-direction entertainment: festivals academia, Broadway reviews, ferry misc. */
const ENTERTAINMENT_NEGATIVE = [
  "broadway review", "off-broadway", "film festival lineup", "film festival unveils",
  "student academy", "documentary film festival", "visions forum", "tiff debut",
  "ciudad de la luz", "ferry", "academic", "lifetime achievement award ceremony lineup",
  "grand prix at deauville", "production at", "developing debut feature",
  "posts fresh deals for", "industry remember legendary",
];

/** Society / civic incident signals. */
const SOCIETY_POSITIVE = [
  "murder", "killed", "killing", "stabbed", "shooting", "shot dead", "homicide",
  "arrested", "arrest", "suspect", "crime", "robbery", "assault", "rape",
  "car crash", "crash", "collision", "accident", "fatal", "died in",
  "earthquake", "flood", "wildfire", "typhoon", "hurricane", "disaster",
  "explosion", "fire engulfs", "building collapse", "mass shooting",
  "police", "jailed", "sentenced", "court hears", "missing person",
  "public safety", "evacuation", "landslide", "train derail", "bus crash",
  "hit-and-run", "domestic violence", "scam targeting", "extradited",
  "speedboat killer", "holdout juror", "found hanging", "deported",
  "minibike", "mclaren crash",
];

/** Geopolitics / finance that should NOT stay in society. */
const SOCIETY_NEGATIVE = [
  "nato", "ukraine war", "ceasefire talks", "stock market", "interest rate",
  "federal reserve", "inflation data", "gdp ", "election poll", "parliament vote",
  "crypto donations", "party donations", "human rights ai", "geopolitics",
];

function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Phrase / token boundary match (avoid "actor" in "factor", "rose" in "arose")
    const re = new RegExp(
      `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,
      "i"
    );
    return re.test(hay);
  });
}

/**
 * Retune category from feed default using title/snippet heuristics.
 * Returns null if the item should be dropped (wrong-direction entertainment).
 */
export function resolveCategory(
  feedCategory: Category,
  title: string,
  description: string
): Category | null {
  const text = `${title} ${description}`.toLowerCase();
  const rawText = `${title} ${description}`;

  // Beauty unused for now — skip
  if (feedCategory === "beauty") {
    return null;
  }

  // East Asia gossip feeds stay in their lane (do not fold into Western entertainment)
  if (feedCategory === "eastAsiaGossip") {
    if (
      includesAny(text, ENTERTAINMENT_NEGATIVE) &&
      !includesAny(text, ENTERTAINMENT_POSITIVE) &&
      !eastAsiaGossipSignal(rawText)
    ) {
      return null;
    }
    return "eastAsiaGossip";
  }

  // Drop clear non-celeb industry/festival noise from entertainment feeds
  if (
    feedCategory === "entertainment" &&
    includesAny(text, ENTERTAINMENT_NEGATIVE) &&
    !includesAny(text, ENTERTAINMENT_POSITIVE)
  ) {
    return null;
  }

  // Keep entertainment-feed items as Western entertainment (already filtered negatives)
  if (feedCategory === "entertainment") {
    return "entertainment";
  }

  // Strong East Asia celeb signals from other feeds → eastAsiaGossip (not entertainment)
  if (eastAsiaGossipSignal(rawText)) {
    if (feedCategory === "finance" || feedCategory === "tech" || feedCategory === "ai") {
      return feedCategory;
    }
    return "eastAsiaGossip";
  }

  // Strong Western celebrity signals from other feeds → entertainment
  if (includesAny(text, ENTERTAINMENT_POSITIVE)) {
    if (feedCategory === "finance" || feedCategory === "tech" || feedCategory === "ai") {
      return feedCategory; // don't steal product/market news
    }
    return "entertainment";
  }

  // Society feeds: map hard news into international (society hidden from main feed)
  if (feedCategory === "society") {
    return "international";
  }

  return feedCategory;
}

export function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, " ");
  for (const t of cleaned.split(/\s+/)) {
    if (!t) continue;
    if (/[\u4e00-\u9fff]/.test(t)) {
      // CJK: emit overlapping bigrams + whole short spans for Jaccard
      if (t.length <= 4 && t.length > 1 && !STOP.has(t)) out.add(t);
      for (let i = 0; i < t.length - 1; i++) {
        const bg = t.slice(i, i + 2);
        if (!STOP.has(bg)) out.add(bg);
      }
      continue;
    }
    if (t.length > 2 && !STOP.has(t)) out.add(t);
  }
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Normalize title for near-dup compare: lowercase, strip punctuation, collapse whitespace. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Generic CJK spans that are roles/actions/controversy — not person names. */
const CJK_NAME_STOP = new Set([
  "分手", "婚變", "復合", "離婚", "緋聞", "網紅", "藝人", "影劇", "直播", "對質",
  "開砲", "道歉", "明星", "女星", "男星", "大姊", "大姐", "全面", "開戰", "踢爆",
  "雙標", "受害者", "聯絡", "前男友", "前女友", "爆料", "公開", "確認", "認了",
  "情斷", "新聞", "娛樂", "討論", "反擊", "私約", "女粉", "持續", "指控", "朋友",
  "關係", "退回", "認愛", "新歌", "現場", "直擊", "演唱會", "發布會", "延期",
  "公告", "粉絲", "本人", "媽媽", "爸爸", "男友", "女友",
  "回顧", "登場", "留言", "快閃", "男神", "阿嬤", "最終", "狀態", "有人", "東森",
  "娛圈", "投票", "家長", "長輩", "迷過", "歌仔",
]);

/** Split CJK runs on role/action/controversy delimiters to isolate name-like spans. */
const CJK_NAME_DELIMS =
  /(?:大姊|大姐|分手|開砲|反擊|踢爆|全面|開戰|對質|道歉|復合|婚變|直播|離婚|私約|女粉|雙標|受害者|持續|聯絡|沒斷|前男友|前女友|爆與|認了|情斷|退回|朋友|關係|認愛|演唱會|發布會|延期|公告|新歌|現場|直擊|深夜|聲明|時間線|攤牌|完整|被爆|遭爆|控|指|稱|跟|與|爆)/g;

const GOSSIP_CONTROVERSY_RE =
  /分手|對質|開砲|道歉|復合|婚變|直播|離婚|出軌|緋聞|踢爆|開戰|反擊/;

/** Strip trailing " - Outlet" / "| Outlet" publisher suffixes from titles. */
export function stripOutletSuffix(title: string): string {
  let t = title.trim();
  // Repeat: "… | EBC 東森娛樂 - LINE TODAY" → drop platform then outlet
  for (let i = 0; i < 3; i++) {
    const next = t.replace(/\s*[-–|]\s*[^-–|]{2,40}\s*$/u, "").trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

/**
 * Extract CJK name-like spans (2–4 chars) from titles for gossip event merge.
 * Delimiter-split isolates people from verbs/roles (e.g. 多米多羅＋芝芝).
 */
export function extractCjkNameSpans(title: string): Set<string> {
  const out = new Set<string>();
  const base = stripOutletSuffix(title);
  for (const m of base.matchAll(/[\u4e00-\u9fff]{2,}/g)) {
    const run = m[0];
    const parts = run.split(CJK_NAME_DELIMS);
    for (const p of parts) {
      if (!p) continue;
      if (p.length >= 2 && p.length <= 4 && !CJK_NAME_STOP.has(p)) {
        out.add(p);
      } else if (p.length > 4) {
        for (const len of [4, 3, 2]) {
          const cand = p.slice(0, len);
          if (!CJK_NAME_STOP.has(cand)) {
            out.add(cand);
            break;
          }
        }
      }
      // Glued Name+verb (芝芝開 / 芝芝深夜發) → emit 2-char nickname prefix
      if (p.length >= 3) {
        const pref2 = p.slice(0, 2);
        if (!CJK_NAME_STOP.has(pref2)) out.add(pref2);
      }
    }
  }
  return out;
}

/** Shared distinctive CJK names between two titles (maximal spans). */
export function sharedCjkNames(a: string, b: string): string[] {
  const na = extractCjkNameSpans(a);
  const nb = extractCjkNameSpans(b);
  const shared = [...na].filter((n) => nb.has(n));
  // Drop spans contained in a longer shared name
  return shared.filter((s) => !shared.some((o) => o !== s && o.includes(s)));
}

/** Same TW gossip event? ≥2 shared names, or 1 long name + controversy tokens. */
const LISTICLE_RE =
  /\d+\s*對|\d+\s*名|盤點|回顧|這些|等人|情侶們|藝人們/;

export function sameGossipEvent(a: string, b: string): boolean {
  const shared = sharedCjkNames(a, b);
  if (shared.length >= 2) return true;
  // Listicles (N對/盤點/回顧) chain-merge unrelated breakups via one shared name — require ≥2
  if (LISTICLE_RE.test(a) || LISTICLE_RE.test(b)) return false;
  // TW nicknames are often 2-char (芝芝); 1 shared name + controversy ⇒ same event
  const nameHit = shared.find((s) => s.length >= 2);
  if (
    nameHit &&
    GOSSIP_CONTROVERSY_RE.test(a) &&
    GOSSIP_CONTROVERSY_RE.test(b)
  ) {
    return true;
  }
  return false;
}

/** Distinctive proper-noun-ish tokens (capitalized / long / CJK names). */
const PUBLISHER_NOISE = new Set([
  "line", "today", "ebc", "ettoday", "yahoo", "setn", "udn", "ltn",
  "chinatimes", "newtalk", "dcard", "gnews", "google", "news",
  "東森", "東森娛樂", "星光雲", "三立", "中時", "自由", "聯合",
]);

export function distinctiveTokens(title: string): Set<string> {
  const out = new Set<string>();
  const base = stripOutletSuffix(title);
  for (const w of base.split(/\s+/)) {
    const clean = w.replace(/[^A-Za-z0-9\u4e00-\u9fff-]/g, "");
    if (!clean || clean.length < 3) continue;
    const lower = clean.toLowerCase();
    if (STOP.has(lower) || PUBLISHER_NOISE.has(lower)) continue;
    if (
      /^[A-Z][a-z]/.test(clean) ||
      /^[A-Z]{2,}/.test(clean) ||
      /[\u4e00-\u9fff]/.test(clean) ||
      clean.length >= 7
    ) {
      out.add(lower);
    }
  }
  // Also include extracted CJK name spans (already outlet-stripped)
  for (const n of extractCjkNameSpans(title)) {
    if (!PUBLISHER_NOISE.has(n)) out.add(n);
  }
  return out;
}

export function titlesNearDuplicate(
  a: string,
  b: string,
  jaccardThreshold = 0.7
): boolean {
  const ta = tokenize(normalizeTitle(a));
  const tb = tokenize(normalizeTitle(b));
  if (jaccard(ta, tb) >= jaccardThreshold) return true;
  // CJK gossip: same people + controversy → one event even if Jaccard low
  if (sameGossipEvent(a, b)) return true;
  // Shared distinctive proper-noun tokens (at least 2, or 1 very long)
  const da = distinctiveTokens(a);
  const db = distinctiveTokens(b);
  let shared = 0;
  let longShared = false;
  for (const t of da) {
    if (db.has(t)) {
      shared++;
      if (t.length >= 8) longShared = true;
    }
  }
  if (shared >= 2 || (shared >= 1 && longShared && jaccard(ta, tb) >= 0.45)) {
    return true;
  }
  return false;
}

/** Prefer hard-news categories over entertainment when mixed. */
const CATEGORY_STRENGTH: Record<string, number> = {
  international: 50,
  finance: 48,
  tech: 46,
  ai: 46,
  society: 30,
  eastAsiaGossip: 18,
  entertainment: 20,
  beauty: 5,
};

export function preferCategory(cats: Category[]): Category {
  let best: Category = cats[0];
  let bestScore = -1;
  for (const c of cats) {
    // Entertainment only wins if ALL members are entertainment (caller filters)
    const s = CATEGORY_STRENGTH[c] ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  // If mix includes entertainment + hard news → hard news
  const hard = cats.filter((c) =>
    ["international", "finance", "tech", "ai"].includes(c)
  );
  if (
    hard.length &&
    cats.some((c) => c === "entertainment" || c === "eastAsiaGossip" || c === "beauty")
  ) {
    return preferCategory(hard);
  }
  return best;
}

/** Prefer titles with more Capitalized tokens / digits (concrete proper nouns). */
export function properNounScore(title: string): number {
  const words = title.split(/\s+/);
  let score = 0;
  for (const w of words) {
    if (/^[A-Z][a-z]/.test(w) || /^[A-Z]{2,}/.test(w) || /\d/.test(w)) score += 2;
    if (w.length > 6) score += 0.5;
  }
  return score;
}

function normalizeUrl(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    x.search = "";
    // Drop common tracking noise already stripped via search; also unify www
    const host = x.hostname.replace(/^www\./, "");
    x.hostname = host;
    return x.toString().replace(/\/$/, "");
  } catch {
    return u;
  }
}

function buildClusterFromMembers(members: RawFeedItem[]): StoryCluster {
  const primary = [...members].sort(
    (a, b) => properNounScore(b.title) - properNounScore(a.title)
  )[0];

  // Prefer enclosure/media-tied images over first <img> scraped from HTML
  // (HTML often includes sibling related-card thumbs on the same page).
  const bestImage =
    members.map((m) => (m.imageFromMedia ? m.imageUrl : undefined)).find((u) => !!u) ??
    members.map((m) => m.imageUrl).find((u) => !!u) ??
    undefined;

  const dates = members
    .map((m) => Date.parse(m.pubDate))
    .filter((n) => !Number.isNaN(n));
  const latest = dates.length
    ? new Date(Math.max(...dates)).toISOString()
    : new Date().toISOString();

  // Category pick: hard news wins on mixed geopolitics/markets; but clear
  // celebrity/gossip signals keep gossip lanes even if some members were
  // remapped to international (e.g. BBC UK / society feeds).
  // Never fold eastAsiaGossip into Western entertainment (or vice versa).
  const cats = members.map((m) => m.category);
  const blobRaw = members.map((m) => `${m.title} ${m.description}`).join(" ");
  const blob = blobRaw.toLowerCase();
  const eaFromFeed = cats.includes("eastAsiaGossip");
  const eaHit = eaFromFeed || eastAsiaGossipSignal(blobRaw);
  const celeb = includesAny(blob, ENTERTAINMENT_POSITIVE);
  const celebNoise =
    includesAny(blob, ENTERTAINMENT_NEGATIVE) && !celeb && !eaHit;
  let category = preferCategory(cats);
  // Pure Western entertainment clusters must stay entertainment (never flip on weak EA substrings)
  const pureWesternEnt =
    cats.every((c) => c === "entertainment") ||
    (cats.includes("entertainment") &&
      !eaFromFeed &&
      !eastAsiaGossipSignal(blobRaw));
  if (eaHit && !celebNoise && !pureWesternEnt) {
    category = "eastAsiaGossip";
  } else if ((celeb || pureWesternEnt) && !celebNoise) {
    category = "entertainment";
  } else if (
    (category === "entertainment" || category === "eastAsiaGossip") &&
    !celeb &&
    !eaHit
  ) {
    const alt = cats.filter(
      (c) => c !== "entertainment" && c !== "eastAsiaGossip"
    );
    category = preferCategory(alt.length ? alt : ["international"]);
  } else if (
    celebNoise &&
    (category === "entertainment" || category === "eastAsiaGossip")
  ) {
    const alt = cats.filter(
      (c) => c !== "entertainment" && c !== "eastAsiaGossip"
    );
    category = preferCategory(alt.length ? alt : ["international"]);
  }

  // Prefer explicit feed region; fall back to majority among members
  const regions = members
    .map((m) => m.region)
    .filter((r): r is NonNullable<typeof r> => !!r);
  let region: (typeof regions)[number] | undefined;
  if (regions.length) {
    const counts: Record<string, number> = {};
    for (const r of regions) counts[r] = (counts[r] ?? 0) + 1;
    region = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as
      | "tw"
      | "jp"
      | "kr"
      | "cn";
  }

  // Final guard: eastAsiaGossip requires an EA-lane feed member or strong EA signal
  if (
    category === "eastAsiaGossip" &&
    !eaFromFeed &&
    !eastAsiaGossipSignal(blobRaw)
  ) {
    const alt = cats.filter((c) => c !== "eastAsiaGossip");
    category = preferCategory(alt.length ? alt : ["international"]);
  }

  return {
    category,
    members,
    primaryTitle: primary.title,
    bestImage,
    publishedAt: latest,
    disagreementHint: detectDisagreement(members),
    region: category === "eastAsiaGossip" ? region : undefined,
  };
}

/**
 * Cluster across categories: same canonical URL or near-dup titles → one story.
 * Soft threshold (~0.38) still merges within-pass; near-dup (≥0.7 / proper nouns)
 * merges even across categories.
 */
export function clusterItems(
  items: RawFeedItem[],
  softThreshold = 0.38
): StoryCluster[] {
  const list = items;
  const used = new Set<number>();
  const tokens = list.map((i) => tokenize(normalizeTitle(i.title)));
  const clusters: StoryCluster[] = [];

  for (let i = 0; i < list.length; i++) {
    if (used.has(i)) continue;
    const members = [list[i]];
    used.add(i);
    for (let j = i + 1; j < list.length; j++) {
      if (used.has(j)) continue;
      // Same canonical URL = same story (never two stories)
      if (normalizeUrl(list[i].link) === normalizeUrl(list[j].link)) {
        members.push(list[j]);
        used.add(j);
        continue;
      }
      // Also match URL against any already-in-cluster member
      if (
        members.some(
          (m) => normalizeUrl(m.link) === normalizeUrl(list[j].link)
        )
      ) {
        members.push(list[j]);
        used.add(j);
        continue;
      }

      // Do not merge East Asia gossip into Western entertainment (or reverse)
      // unless the same canonical URL already matched above.
      const gossipLaneClash = (a: Category, b: Category) => {
        const ea = (c: Category) => c === "eastAsiaGossip";
        const westernGossip = (c: Category) => c === "entertainment";
        const hardNews = (c: Category) =>
          c === "international" || c === "finance" || c === "tech" || c === "ai";
        // Keep East Asia gossip lane isolated from Western gossip AND hard news
        // (same-URL merge already handled above).
        if (ea(a) && (westernGossip(b) || hardNews(b))) return true;
        if (ea(b) && (westernGossip(a) || hardNews(a))) return true;
        return false;
      };
      if (gossipLaneClash(list[i].category, list[j].category)) {
        continue;
      }
      if (members.some((m) => gossipLaneClash(m.category, list[j].category))) {
        continue;
      }

      const sameCatSoft =
        list[i].category === list[j].category &&
        jaccard(tokens[i], tokens[j]) >= softThreshold;
      const nearDup = titlesNearDuplicate(list[i].title, list[j].title, 0.7);
      // Cross-category near-dup or soft same-cat match
      if (nearDup || sameCatSoft) {
        members.push(list[j]);
        used.add(j);
        continue;
      }
      // Near-dup vs any member already in cluster (chain merge)
      if (members.some((m) => titlesNearDuplicate(m.title, list[j].title, 0.7))) {
        members.push(list[j]);
        used.add(j);
      }
    }
    clusters.push(buildClusterFromMembers(members));
  }

  return hardDedupeClusters(clusters);
}

/**
 * Post-pass: fold same-event / near-dup clusters (CJK name merge + Jaccard);
 * no duplicate source URLs across final stories.
 */
export function hardDedupeClusters(clusters: StoryCluster[]): StoryCluster[] {
  // Rank stronger first (more members, stronger category, better proper-noun title)
  const ranked = [...clusters].sort((a, b) => {
    const cat =
      (CATEGORY_STRENGTH[b.category] ?? 0) - (CATEGORY_STRENGTH[a.category] ?? 0);
    if (cat) return cat;
    if (b.members.length !== a.members.length) {
      return b.members.length - a.members.length;
    }
    return properNounScore(b.primaryTitle) - properNounScore(a.primaryTitle);
  });

  const kept: StoryCluster[] = [];
  const usedUrls = new Set<string>();

  const laneClash = (x: Category, y: Category) => {
    const ea = (c: Category) => c === "eastAsiaGossip";
    const western = (c: Category) => c === "entertainment";
    const hard = (c: Category) =>
      c === "international" || c === "finance" || c === "tech" || c === "ai";
    return (
      (ea(x) && (western(y) || hard(y))) || (ea(y) && (western(x) || hard(x)))
    );
  };

  for (const c of ranked) {
    const urls = c.members.map((m) => normalizeUrl(m.link));
    // Drop if any URL already claimed by a stronger cluster
    if (urls.some((u) => usedUrls.has(u))) continue;

    // Fold into an already-kept same-event / near-dup cluster (same gossip lane)
    const foldIdx = kept.findIndex((k) => {
      if (laneClash(k.category, c.category)) return false;
      return (
        titlesNearDuplicate(k.primaryTitle, c.primaryTitle, 0.7) ||
        sameGossipEvent(k.primaryTitle, c.primaryTitle)
      );
    });
    if (foldIdx >= 0) {
      const merged = buildClusterFromMembers([
        ...kept[foldIdx].members,
        ...c.members,
      ]);
      // Re-dedupe URLs inside merged
      const seen = new Set<string>();
      const dedupMembers: RawFeedItem[] = [];
      for (const m of merged.members) {
        const u = normalizeUrl(m.link);
        if (seen.has(u)) continue;
        seen.add(u);
        dedupMembers.push(m);
      }
      kept[foldIdx] = buildClusterFromMembers(dedupMembers);
      for (const u of urls) usedUrls.add(u);
      continue;
    }

    for (const u of urls) usedUrls.add(u);
    const seen = new Set<string>();
    const dedupMembers: RawFeedItem[] = [];
    for (const m of c.members) {
      const u = normalizeUrl(m.link);
      if (seen.has(u)) continue;
      seen.add(u);
      dedupMembers.push(m);
    }
    kept.push(
      dedupMembers.length === c.members.length
        ? c
        : buildClusterFromMembers(dedupMembers)
    );
  }

  // Second merge sweep: primaryTitle same-event rule (catches chain misses)
  return mergeClustersByGossipEvent(kept);
}

/** Second pass: merge clusters that share ≥2 CJK names (or long name + controversy). */
export function mergeClustersByGossipEvent(
  clusters: StoryCluster[]
): StoryCluster[] {
  const laneClash = (x: Category, y: Category) => {
    const ea = (c: Category) => c === "eastAsiaGossip";
    const western = (c: Category) => c === "entertainment";
    const hard = (c: Category) =>
      c === "international" || c === "finance" || c === "tech" || c === "ai";
    return (
      (ea(x) && (western(y) || hard(y))) || (ea(y) && (western(x) || hard(x)))
    );
  };

  const list = [...clusters].sort(
    (a, b) => b.members.length - a.members.length
  );
  const used = new Set<number>();
  const out: StoryCluster[] = [];

  for (let i = 0; i < list.length; i++) {
    if (used.has(i)) continue;
    let members = [...list[i].members];
    used.add(i);
    for (let j = i + 1; j < list.length; j++) {
      if (used.has(j)) continue;
      if (laneClash(list[i].category, list[j].category)) continue;
      if (
        sameGossipEvent(list[i].primaryTitle, list[j].primaryTitle) ||
        titlesNearDuplicate(list[i].primaryTitle, list[j].primaryTitle, 0.7)
      ) {
        members = members.concat(list[j].members);
        used.add(j);
      }
    }
    const seen = new Set<string>();
    const dedup: RawFeedItem[] = [];
    for (const m of members) {
      const u = normalizeUrl(m.link);
      if (seen.has(u)) continue;
      seen.add(u);
      dedup.push(m);
    }
    out.push(buildClusterFromMembers(dedup));
  }
  return out;
}

/** Very simple numeric / named-entity conflict heuristic. */
export function detectDisagreement(members: RawFeedItem[]): string | null {
  if (members.length < 2) return null;
  const numbers = members.map((m) => {
    const text = `${m.title} ${m.description}`;
    return new Set(
      (text.match(/\b\d+(?:\.\d+)?%?\b/g) ?? []).filter(
        (n) => !/^(19|20)\d{2}$/.test(n) // skip years
      )
    );
  });
  // If two members mention different exclusive numbers for similar tokens, flag
  const all = new Set<string>();
  const exclusive: string[] = [];
  for (const set of numbers) {
    for (const n of set) {
      if (all.has(n)) continue;
      // check if another set has a different number of same magnitude class
      all.add(n);
    }
  }
  // Compare pairwise: shared keyword context with conflicting figures
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = [...numbers[i]];
      const b = [...numbers[j]];
      if (a.length && b.length) {
        const onlyA = a.filter((x) => !numbers[j].has(x));
        const onlyB = b.filter((x) => !numbers[i].has(x));
        if (onlyA.length && onlyB.length) {
          exclusive.push(
            `Figures differ across outlets (e.g. ${onlyA[0]} vs ${onlyB[0]} in headlines/snippets).`
          );
        }
      }
    }
  }
  return exclusive[0] ?? null;
}

export function reputationForDomain(domain: string): number {
  const d = domain.replace(/^www\./, "").toLowerCase();
  if (OUTLET_REPUTATION[d] != null) return OUTLET_REPUTATION[d];
  // Try parent domain
  const parts = d.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(-2).join(".");
    if (OUTLET_REPUTATION[parent] != null) return OUTLET_REPUTATION[parent];
  }
  return 10; // unknown blogs / lower prior
}

export function buildTrustBreakdown(cluster: StoryCluster): TrustBreakdown {
  // Count unique publisher domains (not GNews wrapper rows)
  const uniqueDomains = uniquePublisherDomains(cluster);
  const sourceDiversity = Math.min(25, Math.round(uniqueDomains.size * 8));

  const reps = [...uniqueDomains].map((d) => reputationForDomain(d));
  const outletReputation = Math.min(
    25,
    Math.round(reps.reduce((a, b) => a + b, 0) / Math.max(1, reps.length))
  );

  const size = uniqueDomains.size; // honest multi-source = unique publishers
  let crossCorroboration = Math.min(25, 8 + (size - 1) * 7);
  if (cluster.disagreementHint) {
    crossCorroboration = Math.max(6, crossCorroboration - 8);
  }

  const ageMs = Date.now() - Date.parse(cluster.publishedAt);
  const ageHours = Number.isNaN(ageMs) ? 72 : ageMs / 36e5;
  let recency = 25;
  if (ageHours > 6) recency -= 3;
  if (ageHours > 24) recency -= 5;
  if (ageHours > 72) recency -= 6;
  if (ageHours > 168) recency -= 6;
  const descLen = cluster.members.reduce(
    (n, m) => n + (m.description?.length ?? 0) + m.title.length,
    0
  );
  if (descLen < 80) recency -= 4;
  if (descLen > 400) recency += 1;
  const recencyClarity = Math.max(0, Math.min(25, recency));

  return {
    sourceDiversity,
    outletReputation,
    crossCorroboration,
    recencyClarity,
  };
}

const TRENDING_KEYWORDS = [
  "breaking",
  "live",
  "record",
  "surge",
  "crash",
  "election",
  "war",
  "ceasefire",
  "ipo",
  "launch",
  "openai",
  "chatgpt",
  "apple",
  "google",
  "tesla",
  "fed",
  "inflation",
  "oscar",
  "grammy",
  "emmy",
  "super bowl",
  "viral",
  "k-pop",
  "blackpink",
  "bts",
  "lady gaga",
  "taylor swift",
  "murder",
  "arrested",
  "shooting",
];

export function isPopularCluster(cluster: StoryCluster): boolean {
  if (cluster.members.length >= 2) return true;
  const t = cluster.primaryTitle.toLowerCase();
  return TRENDING_KEYWORDS.some((k) => t.includes(k));
}

export function isHeadlineCandidate(
  cluster: StoryCluster,
  breakdown: TrustBreakdown,
  trustScore: number
): boolean {
  const highRepCats: Category[] = ["international", "finance", "tech", "ai"];
  if (
    highRepCats.includes(cluster.category) &&
    cluster.members.length >= 2 &&
    breakdown.outletReputation >= 18
  ) {
    return true;
  }
  return trustScore >= 72 && breakdown.recencyClarity >= 18;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstImg(html: string): string | undefined {
  // Prefer early content images; skip trackers and tiny related-rail thumbs.
  // (Full article-bound selection uses fetchArticleCover in cover.ts.)
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let src = m[1].trim();
    if (!src) continue;
    src = src.replace(/&amp;/gi, "&");
    const low = src.toLowerCase();
    if (
      /scorecardresearch|quantserve|doubleclick|facebook\.com\/tr|\/pixel|1x1|spacer\.|blank\.(gif|png)|tracking|data:image/i.test(
        low
      )
    ) {
      continue;
    }
    if (!/^https?:\/\//i.test(src) && !src.startsWith("/")) continue;
    const w = low.match(/[?&]w=(\d+)/);
    if (w && Number(w[1]) > 0 && Number(w[1]) < 320) continue;
    const h = low.match(/[?&]h=(\d+)/);
    if (h && Number(h[1]) > 0 && Number(h[1]) < 180) continue;
    return src;
  }
  return undefined;
}

export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * Resolve true publisher domain for trust 「N源」 counting.
 * GNews wrappers (news.google.com) map to the underlying outlet via title suffix
 * ("Story - ETtoday") or article host — twenty GNews rows of one site ≠ 20 sources.
 */
export function resolvePublisherDomain(
  link: string,
  title: string,
  feedDomain?: string
): string {
  const host = domainFromUrl(link).toLowerCase();
  if (host && host !== "news.google.com" && host !== "unknown") {
    return canonicalizePublisherDomain(host);
  }

  const m = title.match(/\s[-–|]\s*([^-–|]{2,40})\s*$/);
  if (m) {
    const outlet = m[1].trim().toLowerCase();
    if (outlet.includes("ettoday") || outlet.includes("星光雲")) {
      return "ettoday.net";
    }
    if (outlet.includes("yahoo")) return "tw.news.yahoo.com";
    if (outlet.includes("三立") || outlet.includes("setn")) return "setn.com";
    if (outlet.includes("鏡週刊") || outlet.includes("mirrormedia")) return "mirrormedia.mg";
    if (outlet.includes("自由")) return "ltn.com.tw";
    if (outlet.includes("聯合") || outlet.includes("udn")) return "udn.com";
    if (outlet.includes("中時") || outlet.includes("chinatimes")) return "chinatimes.com";
    if (outlet.includes("東森") || outlet.includes("ebc")) return "news.ebc.net.tw";
    if (outlet.includes("line today") || outlet.includes("line")) return "today.line.me";
    if (outlet.includes("dcard")) return "dcard.tw";
    if (outlet.includes("newtalk")) return "newtalk.tw";
    if (outlet.includes("蘋果") || outlet.includes("appledaily")) return "tw.appledaily.com";
    if (outlet.includes("nownews") || outlet.includes("今日新聞")) return "nownews.com";
    if (outlet.includes("bazaar") || outlet.includes("哈潑")) return "harpersbazaar.com";
    if (outlet.includes("tvbs")) return "tvbs.com.tw";
    if (outlet.includes("華視") || outlet.includes("cts")) return "cts.com.tw";
    // Do NOT slugify unknown outlet labels — that invents fake N源 from GNews wrappers.
  }
  // Prefer site: proxy feedDomain (ettoday.net / setn.com / dcard.tw / today.line.me)
  if (feedDomain && feedDomain !== "news.google.com") {
    return canonicalizePublisherDomain(feedDomain.replace(/^www\./, "").toLowerCase());
  }
  // Unresolved GNews → single bucket (honest 1源), never unique spam slugs
  return canonicalizePublisherDomain(host || "news.google.com");
}

/** Collapse CDN / subdomain variants to one publisher for N源. */
export function canonicalizePublisherDomain(domain: string): string {
  const d = domain.replace(/^www\./, "").toLowerCase();
  if (d === "news.google.com") return d;
  if (d.endsWith("ettoday.net") || d.includes("ettoday")) return "ettoday.net";
  if (d.endsWith("yahoo.com") || d.includes("yahoo")) return "tw.news.yahoo.com";
  if (d.endsWith("setn.com")) return "setn.com";
  if (d.endsWith("mirrormedia.mg") || d.includes("mirrormedia")) return "mirrormedia.mg";
  if (d.endsWith("ltn.com.tw")) return "ltn.com.tw";
  if (d.endsWith("udn.com") || d.includes("udn.com")) return "udn.com";
  if (d.endsWith("chinatimes.com")) return "chinatimes.com";
  if (d.endsWith("ebc.net.tw") || d.includes("ebc")) return "news.ebc.net.tw";
  if (d.endsWith("line.me") || d.includes("today.line")) return "today.line.me";
  if (d.endsWith("dcard.tw")) return "dcard.tw";
  if (d.endsWith("soompi.com")) return "soompi.com";
  if (d.endsWith("koreaboo.com")) return "koreaboo.com";
  if (d.endsWith("sina.com.cn") || d.endsWith("sina.com")) return "sina.com.cn";
  return d;
}

/** Unique publisher domains in a cluster (for honest N源). */
export function uniquePublisherDomains(cluster: StoryCluster): Set<string> {
  return new Set(
    cluster.members.map((m) =>
      resolvePublisherDomain(m.link, m.title, m.domain).replace(/^www\./, "").toLowerCase()
    )
  );
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function buildExtractiveDigest(cluster: StoryCluster): {
  summaryEn: string;
  bodyEn: string;
} {
  const outlets = [...new Set(cluster.members.map((m) => m.outletName))];
  const snippets = cluster.members
    .map((m) => stripHtml(m.description || ""))
    .filter((s) => s.length > 40);

  const uniqueSnips: string[] = [];
  for (const s of snippets) {
    if (!uniqueSnips.some((u) => jaccard(tokenize(u), tokenize(s)) > 0.7)) {
      uniqueSnips.push(s);
    }
  }

  const lede =
    uniqueSnips[0]?.slice(0, 280) ||
    `${cluster.primaryTitle}. Coverage from ${outlets.join(", ")}.`;

  const summaryEn =
    lede.length > 220 ? lede.slice(0, 217) + "…" : lede;

  const whatHappened = [
    cluster.primaryTitle + ".",
    ...uniqueSnips.slice(0, 4).map((s) => s.slice(0, 400)),
  ].join(" ");

  const why =
    `This cluster was assembled from ${cluster.members.length} feed item(s) ` +
    `across ${outlets.length} outlet(s) (${outlets.join(", ")}) in the ` +
    `${cluster.category} category. Axiom links out to each publisher; ` +
    `this digest only restates titles and short feed descriptions — not full articles.`;

  const agree =
    cluster.members.length >= 2
      ? `Multiple outlets are covering closely related headlines: ${cluster.members
          .map((m) => `"${m.title}" (${m.outletName})`)
          .slice(0, 5)
          .join("; ")}.`
      : `Currently a single-outlet feed item; corroboration may rise as other allow-listed sources pick up the story.`;

  const disagree = cluster.disagreementHint
    ? cluster.disagreementHint
    : "No clear numeric/name conflicts detected in the short feed snippets; always verify details on the publisher pages.";

  const uncertain =
    "Feed descriptions can omit context, updates, or corrections. Click through to the linked outlets for the latest full reporting. Trust scores are heuristics, not fact-check guarantees.";

  let bodyEn = [
    lede,
    "",
    "What happened",
    whatHappened,
    "",
    "Why it matters",
    why,
    "",
    "Sources agree / disagree",
    agree,
    disagree,
    "",
    "Still uncertain",
    uncertain,
    "",
    "Linked sources (outlet names only): " +
      [...new Set(cluster.members.map((m) => m.outletName))].join(", "),
  ].join("\n");

  // Pad toward ~200+ words when source text allows
  const words = bodyEn.split(/\s+/).length;
  if (words < 200 && uniqueSnips.length) {
    bodyEn +=
      "\n\nAdditional feed context\n" +
      uniqueSnips
        .slice(0, 6)
        .map((s, i) => `(${i + 1}) ${s}`)
        .join("\n");
  }

  return { summaryEn, bodyEn };
}

export function pickBalancedClusters(
  clusters: StoryCluster[],
  targetMin = 12,
  targetMax = 16,
  opts: { heatKeywords?: string[] } = {}
): StoryCluster[] {
  const heatKeywords = opts.heatKeywords ?? [];
  const perCatTarget: Record<string, number> = {
    international: 3,
    finance: 2,
    tech: 2,
    ai: 2,
    entertainment: 2,
    eastAsiaGossip: 5,
    society: 0,
    beauty: 0,
  };

  const CELEB_DOMAINS = new Set([
    "billboard.com",
    "rollingstone.com",
    "tmz.com",
    "hollywoodlife.com",
    "justjared.com",
    "etonline.com",
  ]);

  const EA_DOMAINS = new Set([
    "soompi.com",
    "koreaboo.com",
    "ettoday.net",
    "sina.com.cn",
    "sina.com",
    "news.google.com",
    "tw.news.yahoo.com",
    "setn.com",
    "today.line.me",
    "dcard.tw",
  ]);

  /** TW-lane domains should outrank Soompi when competing for EA slots. */
  const TW_PREFERRED_DOMAINS = new Set([
    "ettoday.net",
    "news.google.com",
    "tw.news.yahoo.com",
    "setn.com",
    "today.line.me",
    "ltn.com.tw",
    "udn.com",
    "mirrormedia.mg",
  ]);

  const TW_GOSSIP_TITLE_RE =
    /分手|婚變|復合|直播對質|對質|緋聞|網紅|藝人|影劇/;

  const scored = clusters.map((c) => {
    const tb = buildTrustBreakdown(c);
    let score =
      computeTrustScore(tb) +
      (c.members.length - 1) * 8 +
      (Date.parse(c.publishedAt) || 0) / 1e12;
    // Prefer true celebrity/pop outlets inside Western entertainment
    if (c.category === "entertainment") {
      const domains = c.members.map((m) =>
        m.domain.replace(/^www\./, "").toLowerCase()
      );
      const celebHit = domains.some((d) => CELEB_DOMAINS.has(d));
      if (celebHit) score += 18;
      if (domains.some((d) => d === "billboard.com" || d === "rollingstone.com" || d === "tmz.com")) {
        score += 8;
      }
      // Soft-penalize BBC arts sports / kids toy / non-celeb misc
      const t = c.primaryTitle.toLowerCase();
      if (/sport|betting advert|ferry|deport|dollhouse|blind box/.test(t)) score -= 14;
    }
    // Prefer regional East Asia gossip outlets — TW heat ≫ jp/kr/cn
    if (c.category === "eastAsiaGossip") {
      const domains = c.members.map((m) =>
        m.domain.replace(/^www\./, "").toLowerCase()
      );
      if (domains.some((d) => EA_DOMAINS.has(d))) score += 12;
      // TW preferred domains above Soompi for TW-lane competition
      if (domains.some((d) => TW_PREFERRED_DOMAINS.has(d))) score += 18;
      if (domains.some((d) => d === "ettoday.net")) score += 8;
      if (domains.some((d) => d === "soompi.com" || d === "koreaboo.com")) score += 4;
      // Koreaboo lower reputation — mild score penalty vs Soompi
      if (domains.every((d) => d === "koreaboo.com")) score -= 4;
      // Strong TW region boost
      if (c.region === "tw") score += 24;
      else if (c.region === "jp" || c.region === "kr" || c.region === "cn") score -= 10;
      else if (c.region) score += 2;
      // Multi-member cluster heat
      if (c.members.length >= 2) score += 10;
      if (c.members.length >= 3) score += 6;
      // Title gossip / heat lexicon
      if (TW_GOSSIP_TITLE_RE.test(c.primaryTitle)) score += 14;
      for (const kw of heatKeywords) {
        if (kw && c.primaryTitle.includes(kw)) score += 12;
      }
    }
    // Prefer clear crime/accident society clusters
    if (c.category === "society") {
      const t = `${c.primaryTitle}`.toLowerCase();
      if (
        /murder|kill|arrest|crash|shoot|stab|crime|disaster|flood|earthquake|fire|jailed|suspect/.test(
          t
        )
      ) {
        score += 12;
      }
      if (/school dinner|crypto donations|party donations|human rights ai/.test(t)) {
        score -= 10;
      }
    }
    return { c, score, tb };
  });

  scored.sort((a, b) => b.score - a.score);

  const picked: StoryCluster[] = [];
  const counts: Record<string, number> = {};
  const pickedSet = new Set<StoryCluster>();

  const entDomains = new Set<string>();
  const eaDomains = new Set<string>();
  const eaRegions = new Set<string>();

  const tryPick = (c: StoryCluster, forceEaTw = false): boolean => {
    if (pickedSet.has(c)) return false;
    if (c.category === "society" || c.category === "beauty") return false;
    const n = counts[c.category] ?? 0;
    if (n >= (perCatTarget[c.category] ?? 3)) return false;
    if (c.category === "entertainment") {
      const dom = c.members[0]?.domain.replace(/^www\./, "").toLowerCase() ?? "";
      if (entDomains.has(dom) && entDomains.size < 4 && n >= 1) return false;
      if (dom) entDomains.add(dom);
    }
    if (c.category === "eastAsiaGossip") {
      const fromEaFeed = c.members.some((m) => m.category === "eastAsiaGossip");
      if (!fromEaFeed && !c.region) return false;
      if (forceEaTw && c.region !== "tw") return false;
      const dom = c.members[0]?.domain.replace(/^www\./, "").toLowerCase() ?? "";
      // While filling TW quota, allow same-domain TW stories more freely
      if (!forceEaTw) {
        if (c.region && eaRegions.has(c.region) && eaRegions.size < 4 && n >= 3) {
          if (dom && eaDomains.has(dom)) return false;
        }
        if (dom && eaDomains.has(dom) && eaDomains.size < 5 && n >= 2) return false;
      }
      if (dom) eaDomains.add(dom);
      if (c.region) eaRegions.add(c.region);
    }
    picked.push(c);
    pickedSet.add(c);
    counts[c.category] = n + 1;
    return true;
  };

  // Pass 1: reserve ≥3 TW eastAsiaGossip slots (TW-first)
  const EA_TW_MIN = 3;
  for (const { c } of scored) {
    if ((counts["eastAsiaGossip"] ?? 0) >= EA_TW_MIN) break;
    if (c.category !== "eastAsiaGossip") continue;
    tryPick(c, true);
  }

  // Pass 2: fill remaining category quotas (jp/kr/cn may take leftover EA slots)
  for (const { c } of scored) {
    if (picked.length >= targetMax) break;
    tryPick(c, false);
  }

  // Fill to min if short
  if (picked.length < targetMin) {
    for (const { c } of scored) {
      if (pickedSet.has(c)) continue;
      if (c.category === "society" || c.category === "beauty") continue;
      picked.push(c);
      pickedSet.add(c);
      if (picked.length >= targetMin) break;
    }
  }

  // Hard-dedupe after pick: ≥2 shared CJK name entities → keep hotter / multi-source
  return foldPickedSameEvents(picked);
}

/** After pick: fold any remaining same-event gossip cards (shared ≥2 names). */
export function foldPickedSameEvents(picked: StoryCluster[]): StoryCluster[] {
  if (picked.length < 2) return picked;
  const score = (c: StoryCluster) =>
    uniquePublisherDomains(c).size * 20 + c.members.length * 8;

  const ranked = [...picked].sort((a, b) => score(b) - score(a));
  const kept: StoryCluster[] = [];
  const used = new Set<number>();

  for (let i = 0; i < ranked.length; i++) {
    if (used.has(i)) continue;
    let members = [...ranked[i].members];
    used.add(i);
    for (let j = i + 1; j < ranked.length; j++) {
      if (used.has(j)) continue;
      // Only fold within eastAsiaGossip / entertainment gossip lanes
      const bothGossip =
        (ranked[i].category === "eastAsiaGossip" ||
          ranked[i].category === "entertainment") &&
        ranked[i].category === ranked[j].category;
      if (!bothGossip && ranked[i].category !== ranked[j].category) continue;
      const titlesA = [
        ranked[i].primaryTitle,
        ...ranked[i].members.map((m) => m.title),
      ];
      const titlesB = [
        ranked[j].primaryTitle,
        ...ranked[j].members.map((m) => m.title),
      ];
      let same = sameGossipEvent(ranked[i].primaryTitle, ranked[j].primaryTitle);
      if (!same) {
        outer: for (const ta of titlesA) {
          for (const tb of titlesB) {
            if (sameGossipEvent(ta, tb)) {
              same = true;
              break outer;
            }
          }
        }
      }
      if (same) {
        members = members.concat(ranked[j].members);
        used.add(j);
      }
    }
    const seen = new Set<string>();
    const dedup: RawFeedItem[] = [];
    for (const m of members) {
      const u = normalizeUrl(m.link);
      if (seen.has(u)) continue;
      seen.add(u);
      dedup.push(m);
    }
    kept.push(buildClusterFromMembers(dedup));
  }
  return kept;
}

export type { Story };
