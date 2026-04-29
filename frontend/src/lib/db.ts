import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { Pool } from "pg";
import path from "path";

const prismaClientSingleton = () => {
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
    const dbPath = path.join(process.cwd(), "prisma/dev.db");
    const AdapterClass = (PrismaBetterSqlite3 as any).default || PrismaBetterSqlite3;
    const adapter = new AdapterClass({ url: `file:${dbPath}` });
    return new PrismaClient({ adapter });
  }
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Force a fresh instance once to clear any stale global state
const prisma = prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
