/**
 * Article-bound cover selection.
 * Prefer this story's own og/twitter/article image; reject hub/list sibling cards.
 */

export const USER_AGENT_COVER =
  "AxiomDigest/0.1 (+https://github.com/; educational multi-source news digest; summarize+link only)";

const OG_TIMEOUT_MS = 8_000;

/** Tiny / tracker / related-rail thumbs we should never use as story covers. */
export function isJunkImageUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (!/^https?:\/\//i.test(url)) return true;
  if (
    /scorecardresearch|quantserve|doubleclick|facebook\.com\/tr|pixel\.|\/pixel|1x1|spacer\.|blank\.(gif|png)|tracking/i.test(
      u
    )
  ) {
    return true;
  }
  // Common related-card thumbs (Billboard etc. use w=237 for rail)
  const w = u.match(/[?&]w=(\d+)/);
  if (w && Number(w[1]) > 0 && Number(w[1]) < 320) return true;
  const h = u.match(/[?&]h=(\d+)/);
  if (h && Number(h[1]) > 0 && Number(h[1]) < 180) return true;
  if (/resize=\d{1,3},\d{1,3}/i.test(u)) {
    const m = u.match(/resize=(\d+),(\d+)/i);
    if (m && (Number(m[1]) < 320 || Number(m[2]) < 180)) return true;
  }
  return false;
}

export function resolveAbsoluteUrl(maybe: string, base: string): string | undefined {
  try {
    const abs = new URL(maybe, base).toString();
    if (!/^https?:\/\//i.test(abs)) return undefined;
    return abs;
  } catch {
    return undefined;
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#38;/g, "&")
    .replace(/&#x26;/gi, "&");
}

function extractHead(html: string): string {
  const m = html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i);
  return m ? m[0] : html.slice(0, 80_000);
}

function metaContents(head: string, names: string[]): string[] {
  const out: string[] = [];
  for (const name of names) {
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "gi"
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`,
      "gi"
    );
    for (const re of [re1, re2]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(head))) {
        const v = decodeHtmlEntities(m[1].trim());
        if (v) out.push(v);
      }
    }
  }
  return out;
}

function metaSingle(head: string, names: string[]): string | undefined {
  return metaContents(head, names)[0];
}

/** Heuristic: portal / section / homepage — many cards, not one article. */
export function looksLikeHubOrListPage(html: string, finalUrl: string): boolean {
  try {
    const u = new URL(finalUrl);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || path === "") return true;
    // Section indexes: /music/, /news/, /entertainment/ without slug id
    if (/^\/[a-z0-9_-]+\/?$/i.test(path) && !/\d{5,}/.test(path)) return true;
  } catch {
    /* ignore */
  }

  const head = extractHead(html);
  const ogType = (metaSingle(head, ["og:type"]) || "").toLowerCase();
  if (ogType === "website" || ogType === "profile") return true;

  const ogImages = metaContents(head, ["og:image", "og:image:url"]);
  const uniqueOg = new Set(
    ogImages.map((x) => {
      try {
        const u = new URL(x);
        u.search = "";
        return u.toString();
      } catch {
        return x;
      }
    })
  );
  // Multiple distinct og:images in <head> → usually a package/hub
  if (uniqueOg.size >= 3) return true;

  const articleTags = (html.match(/<article\b/gi) || []).length;
  if (articleTags >= 6) return true;

  return false;
}

export type ArticleCoverResult = {
  url: string;
  via: "og:image" | "twitter:image" | "article:image" | "link-image_src";
};

/**
 * Fetch cover bound to THIS article URL only (head meta).
 * Returns undefined on hub/list pages or when no usable meta image.
 */
export async function fetchArticleCover(
  articleUrl: string,
  opts?: { timeoutMs?: number; userAgent?: string }
): Promise<ArticleCoverResult | undefined> {
  const timeoutMs = opts?.timeoutMs ?? OG_TIMEOUT_MS;
  const ua = opts?.userAgent ?? USER_AGENT_COVER;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": ua, Accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return undefined;
    const finalUrl = res.url || articleUrl;
    const html = await res.text();

    if (looksLikeHubOrListPage(html, finalUrl)) return undefined;

    const head = extractHead(html);
    const candidates: Array<{ raw: string; via: ArticleCoverResult["via"] }> = [
      ...metaContents(head, ["og:image", "og:image:url"]).map((raw) => ({
        raw,
        via: "og:image" as const,
      })),
      ...metaContents(head, ["twitter:image", "twitter:image:src"]).map((raw) => ({
        raw,
        via: "twitter:image" as const,
      })),
      ...metaContents(head, ["article:image"]).map((raw) => ({
        raw,
        via: "article:image" as const,
      })),
    ];

    const linkImg = head.match(
      /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i
    ) || head.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i);
    if (linkImg?.[1]) {
      candidates.push({ raw: decodeHtmlEntities(linkImg[1]), via: "link-image_src" });
    }

    for (const c of candidates) {
      const abs = resolveAbsoluteUrl(c.raw, finalUrl);
      if (!abs || isJunkImageUrl(abs)) continue;
      return { url: abs, via: c.via };
    }
    return undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Prefer enclosure/media (item-tied) over HTML scraping.
 * When articleUrl is known, prefer that document's og/twitter image so sibling
 * cards on the same page cannot win.
 */
export async function resolveStoryCover(opts: {
  articleUrl?: string;
  feedImageUrl?: string;
  /** true when feedImage came from enclosure / media:* (trusted item binding) */
  feedImageFromMedia?: boolean;
}): Promise<string | undefined> {
  const { articleUrl, feedImageUrl, feedImageFromMedia } = opts;

  if (feedImageFromMedia && feedImageUrl && !isJunkImageUrl(feedImageUrl)) {
    // Still try article OG — if present, prefer article-bound meta (more accurate)
    if (articleUrl) {
      const og = await fetchArticleCover(articleUrl);
      if (og) return og.url;
    }
    return feedImageUrl;
  }

  if (articleUrl) {
    const og = await fetchArticleCover(articleUrl);
    if (og) return og.url;
  }

  if (feedImageUrl && !isJunkImageUrl(feedImageUrl)) return feedImageUrl;
  return undefined;
}
