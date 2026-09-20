import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
    "*.tunnelmole.net",
    "few-drinks-poke.loca.lt",
    "hl0bam-ip-184-193-190-141.tunnelmole.net",
  ],
};

export default nextConfig;
