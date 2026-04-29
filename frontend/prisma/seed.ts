import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Initialize Prisma Client with Driver Adapter (Required for Prisma 7)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const products = [
  // Home & Garden
  {
    name: "EcoComfort Chair",
    description: "Ergonomically designed chair made from recycled ocean plastics. Perfect for long working hours.",
    price: 199.99,
    category: "home_garden",
    stock: 50,
    imageUrl: "/images/home_garden/ecocomfort_chair.png",
  },
  {
    name: "Gourmet Coffee Maker",
    description: "Professional grade espresso machine for the home barista. Features precise temperature control.",
    price: 449.50,
    category: "home_garden",
    stock: 15,
    imageUrl: "/images/home_garden/gourmet_coffee_maker.png",
  },
  {
    name: "PureStream Purifier",
    description: "HEPA-certified air purifier with smart sensing technology. Ideal for allergy sufferers.",
    price: 299.00,
    category: "home_garden",
    stock: 25,
    imageUrl: "/images/home_garden/purestream_purifier.png",
  },
  // Clothing
  {
    name: "ActiveRun Shoes",
    description: "Lightweight running shoes with responsive cushioning. Designed for high-performance athletes.",
    price: 129.99,
    category: "clothing",
    stock: 100,
    imageUrl: "/images/clothing/activerun_shoes.png",
  },
  {
    name: "PeakPerformance Tee",
    description: "Moisture-wicking athletic tee. Breathable fabric keeps you cool during intense workouts.",
    price: 34.95,
    category: "clothing",
    stock: 200,
    imageUrl: "/images/clothing/peakperformance_tee.png",
  },
  {
    name: "UrbanStyle Hoodie",
    description: "Premium cotton-blend hoodie. Minimalist design for everyday comfort and style.",
    price: 79.00,
    category: "clothing",
    stock: 80,
    imageUrl: "/images/clothing/urbanstyle_hoodie.png",
  },
  // Electronics
  {
    name: "SmartFit Watch",
    description: "Advanced fitness tracker with heart rate monitoring, GPS, and sleep analysis.",
    price: 159.00,
    category: "electronics",
    stock: 60,
    imageUrl: "/images/electronics/smartfit_watch.png",
  },
  {
    name: "ProSound Headphones",
    description: "Noise-canceling over-ear headphones with 40-hour battery life and superior audio quality.",
    price: 249.99,
    category: "electronics",
    stock: 30,
    imageUrl: "/images/electronics/prosound_headphones.png",
  },
  {
    name: "UltraTech Laptop",
    description: "Powerful 14-inch laptop with M3 chip, 16GB RAM, and 512GB SSD. Built for creators.",
    price: 1299.00,
    category: "electronics",
    stock: 10,
    imageUrl: "/images/electronics/ultratech_laptop.png",
  },
  // Sports
  {
    name: "Titanium Yoga Mat",
    description: "Non-slip, extra thick yoga mat. Durable material with alignment lines for perfect poses.",
    price: 55.00,
    category: "sports",
    stock: 120,
    imageUrl: "/images/sports/titanium_yoga_mat.png",
  },
  {
    name: "Endurance Dumbbells",
    description: "Adjustable weights ranging from 5lb to 50lb. Space-saving design for home gyms.",
    price: 299.99,
    category: "sports",
    stock: 40,
    imageUrl: "/images/sports/endurance_dumbbells.png",
  },
  {
    name: "Adventure Backpack",
    description: "Waterproof hiking backpack with 40L capacity. Includes hydration bladder compartment.",
    price: 89.50,
    category: "sports",
    stock: 75,
    imageUrl: "/images/sports/adventure_backpack.png",
  },
];

async function main() {
  console.log("Seeding products...");
  // Clear existing products to prevent duplicates on re-seed
  await prisma.product.deleteMany({});
  
  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("SEED ERROR:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Only disconnect if prisma was initialized successfully
    if (prisma) {
      await prisma.$disconnect();
    }
  });
