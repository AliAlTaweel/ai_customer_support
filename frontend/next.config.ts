import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  env: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
    DATABASE_URL: process.env.DATABASE_URL || "",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
  },
};

export default nextConfig;
