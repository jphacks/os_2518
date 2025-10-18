import path from "path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},
  serverExternalPackages: ['nodemailer', 'node-cron'],
  transpilePackages: [
    "@fullcalendar/react",
    "@fullcalendar/core",
    "@fullcalendar/daygrid",
    "@fullcalendar/timegrid",
    "@fullcalendar/interaction",
  ],
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
    if (!config.externals) {
      config.externals = [];
    }
    if (Array.isArray(config.externals)) {
      config.externals.push('nodemailer', 'node-cron');
    }
    return config;
  },
};

export default nextConfig;
