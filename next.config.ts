import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 靜態匯出（GitHub Pages 部署用，2026-10-03）
  output: "export",
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
    "*.tunnelmole.net",
    "few-drinks-poke.loca.lt",
    "hl0bam-ip-184-193-190-141.tunnelmole.net",
  ],
};

export default nextConfig;
