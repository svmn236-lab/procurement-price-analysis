import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: {
      // 增強 Turbopack 的專案根目錄識別
      root: "./",
    },
  },
};

export default nextConfig;
