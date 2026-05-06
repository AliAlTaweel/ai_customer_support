import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  async rewrites() {
    return [
      {
        // Proxy Clerk Frontend API through our own domain
        // Required because amplifyapp.com DNS cannot be modified
        source: "/__clerk/:path*",
        destination: "https://frontend-api.clerk.services/:path*",
      },
    ];
  },
};

export default nextConfig;
