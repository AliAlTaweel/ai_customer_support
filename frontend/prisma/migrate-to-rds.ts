import "dotenv/config";
import Database from "better-sqlite3";
import { Client } from "pg";
import path from "path";

async function migrate() {
  const url = process.env.DATABASE_URL;
  console.log("🚀 Starting pure-PG data migration (with SSL)...");

  if (!url) {
    console.error("❌ DATABASE_URL not found in .env");
    return;
  }

  // 1. Initialize Raw SQLite Connection
  const dbPath = path.join(process.cwd(), "prisma/dev.db");
  const sqlite = new Database(dbPath);

  // 2. Initialize Raw PostgreSQL Client with SSL (Required for RDS)
  const pg = new Client({ 
    connectionString: url,
    ssl: {
      rejectUnauthorized: false // Required for RDS if you don't provide the CA cert
    }
  });

  try {
    await pg.connect();
    console.log("✅ Connected to PostgreSQL.");

    // --- MIGRATING PRODUCTS ---
    console.log("📦 Migrating Products...");
    const products = sqlite.prepare("SELECT * FROM Product").all() as any[];
    await pg.query('DELETE FROM "OrderItem"');
    await pg.query('DELETE FROM "Order"');
    await pg.query('DELETE FROM "Product"');

    for (const p of products) {
      const query = {
        text: 'INSERT INTO "Product"(id, name, description, price, category, stock, "imageUrl", details, "createdAt", "updatedAt") VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        values: [p.id, p.name, p.description, p.price, p.category, p.stock, p.imageUrl, p.details, new Date(p.createdAt), new Date(p.updatedAt)],
      };
      await pg.query(query);
    }
    console.log(`✅ Migrated ${products.length} products.`);

    // --- MIGRATING ORDERS ---
    console.log("🛍️ Migrating Orders...");
    const orders = sqlite.prepare("SELECT * FROM 'Order'").all() as any[];
    for (const o of orders) {
      const query = {
        text: 'INSERT INTO "Order"(id, "userId", total, status, "createdAt", "updatedAt", "paymentMethod", "shippingAddress", "shippingCity", "shippingCountry", "shippingState", "shippingZip", "customerEmail", "customerName") VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
        values: [o.id, o.userId, o.total, o.status, new Date(o.createdAt), new Date(o.updatedAt), o.paymentMethod, o.shippingAddress, o.shippingCity, o.shippingCountry, o.shippingState, o.shippingZip, o.customerEmail, o.customerName],
      };
      await pg.query(query);
    }
    console.log(`✅ Migrated ${orders.length} orders.`);

    // --- MIGRATING ORDER ITEMS ---
    console.log("🔢 Migrating Order Items...");
    const orderItems = sqlite.prepare("SELECT * FROM OrderItem").all() as any[];
    for (const item of orderItems) {
      const query = {
        text: 'INSERT INTO "OrderItem"(id, "orderId", "productId", quantity, price) VALUES($1, $2, $3, $4, $5)',
        values: [item.id, item.orderId, item.productId, item.quantity, item.price],
      };
      await pg.query(query);
    }
    console.log(`✅ Migrated ${orderItems.length} order items.`);

    // --- MIGRATING CHAT MESSAGES ---
    console.log("💬 Migrating Chat Messages...");
    const messages = sqlite.prepare("SELECT * FROM ChatMessage").all() as any[];
    await pg.query('DELETE FROM "ChatMessage"');
    for (const m of messages) {
      const query = {
        text: 'INSERT INTO "ChatMessage"(id, role, content, "userName", "userId", "promptTokens", "completionTokens", "totalTokens", "createdAt") VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        values: [m.id, m.role, m.content, m.userName, m.userId, m.promptTokens, m.completionTokens, m.totalTokens, new Date(m.createdAt)],
      };
      await pg.query(query);
    }
    console.log(`✅ Migrated ${messages.length} messages.`);

    console.log("\n🎉 Migration completed successfully!");

  } catch (error: any) {
    console.error("❌ Migration failed:");
    console.error(error.message);
  } finally {
    sqlite.close();
    await pg.end();
  }
}

migrate();
