import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 靜態匯出（GitHub Pages 部署用，2026-10-03）
  output: "export",
  // GitHub Pages 專案站掛在子路徑下，_next 資源與 Link 需加前綴（2026-10-03）
  basePath: "/Trust-digest",
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
    "*.tunnelmole.net",
    "few-drinks-poke.loca.lt",
    "hl0bam-ip-184-193-190-141.tunnelmole.net",
  ],
};

export default nextConfig;
