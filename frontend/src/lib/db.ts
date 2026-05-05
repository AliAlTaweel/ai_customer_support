import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = async (): Promise<PrismaClient> => {
  const url = process.env.DATABASE_URL || "";
  
  if (url.startsWith("postgresql")) {
    console.log("[PRISMA DEBUG] Initializing PrismaClient with PostgreSQL adapter...");
    const pool = new Pool({ 
      connectionString: url,
      ssl: url.includes("amazonaws.com") ? { rejectUnauthorized: false } : false
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } else {
    console.log("[PRISMA DEBUG] Initializing PrismaClient with SQLite adapter...");
    // Dynamic import to avoid loading native binary in production (Amplify Lambda)
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const path = await import("path");
    const dbPath = path.join(process.cwd(), "prisma/dev.db");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AdapterClass = (PrismaBetterSqlite3 as any).default || PrismaBetterSqlite3;
    const adapter = new AdapterClass({ url: `file:${dbPath}` });
    return new PrismaClient({ adapter });
  }
};

declare global {
  var _prisma: PrismaClient | undefined;
}

/**
 * Returns a cached PrismaClient instance (creates one on first call).
 * Uses dynamic imports for SQLite adapter to avoid native binary crashes on Lambda.
 */
export async function getPrisma(): Promise<PrismaClient> {
  if (globalThis._prisma) return globalThis._prisma;

  const client = await prismaClientSingleton();
  globalThis._prisma = client;
  return client;
}

// Default export for backward compatibility
export default getPrisma;
