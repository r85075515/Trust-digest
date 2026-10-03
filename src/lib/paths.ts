/**
 * GitHub Pages 專案站掛在子路徑 /Trust-digest 下。
 * next.config.ts 的 basePath 會自動處理 _next 資源與 next/link，
 * 但 raw <img src> 不會，本地資源路徑需經此 helper 加前綴。
 * （2026-10-03）
 */
export const BASE_PATH = "/Trust-digest";

/** 本地資源路徑（/covers/...）加上 Pages 子路徑前綴；外部 URL 原樣回傳。 */
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith(BASE_PATH)) {
    return path;
  }
  return path.startsWith("/") ? `${BASE_PATH}${path}` : path;
}
