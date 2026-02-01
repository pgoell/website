import type { NextConfig } from "next";

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
            }
        ]
    }
}

export default config;