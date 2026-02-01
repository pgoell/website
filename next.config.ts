import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co", // Sporitify CDN
      },
    ],
  },
};

export default withNextIntl(config);
