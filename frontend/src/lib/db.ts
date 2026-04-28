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
    const client = new PrismaClient({ adapter });
    
    // Debug: Log available models
    const models = Object.keys(client).filter(key => !key.startsWith('_') && !key.startsWith('$'));
    console.log("[PRISMA DEBUG] Available models:", models);
    
    return client;
  } catch (err) {
    console.error("[PRISMA ERROR] Failed to initialize adapter:", err);
    throw err;
  }
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Force a fresh instance once to clear any stale global state
const prisma = prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
