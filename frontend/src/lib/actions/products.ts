"use server";

import prisma from "@/lib/db";

export async function getProducts(category?: string) {
  try {
    const products = await prisma.product.findMany({
      where: category && category !== "all" ? { category } : {},
      orderBy: { createdAt: "desc" },
    });
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function getProductById(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });
    return product;
  } catch (error) {
    console.error(`Error fetching product with id ${id}:`, error);
    return null;
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.product.findMany({
      select: { category: true },
      distinct: ["category"],
    });
    return categories.map((c) => c.category);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}
