import path from "path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@": "./src",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(__dirname, "./src"),
    };
    return config;
  },
};

export default nextConfig;
