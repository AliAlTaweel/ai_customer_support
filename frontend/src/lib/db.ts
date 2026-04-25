import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const prismaClientSingleton = () => {
  const dbPath = path.join(process.cwd(), "prisma/dev.db");
  
  console.log("[PRISMA DEBUG] Initializing PrismaClient with adapter...");
  console.log("[PRISMA DEBUG] dbPath:", dbPath);
  console.log("[PRISMA DEBUG] PrismaBetterSqlite3 type:", typeof PrismaBetterSqlite3);

  // In some environments, PrismaBetterSqlite3 might be a default export or a named export
  const AdapterClass = (PrismaBetterSqlite3 as any).default || PrismaBetterSqlite3;

  try {
    const adapter = new AdapterClass({ url: `file:${dbPath}` });
    return new PrismaClient({ adapter });
  } catch (err) {
    console.error("[PRISMA ERROR] Failed to initialize adapter:", err);
    throw err;
  }
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
