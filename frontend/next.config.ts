import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  env: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "",
    DATABASE_URL: process.env.DATABASE_URL || "",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
  },
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
