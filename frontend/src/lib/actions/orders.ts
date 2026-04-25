"use server";

import prisma from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export interface OrderItemInput {
  productId: string;
  quantity: number;
  price: number;
}

export interface ShippingAddressInput {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export async function createOrder(
  items: OrderItemInput[], 
  total: number, 
  shipping?: ShippingAddressInput, 
  paymentMethod?: string,
  customerName?: string
) {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    const customerEmail = user?.emailAddresses[0]?.emailAddress;

    // Start a transaction to ensure atomicity
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the Order
      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          status: "PROCESSING",
          shippingAddress: shipping?.address,
          shippingCity: shipping?.city,
          shippingState: shipping?.state,
          shippingZip: shipping?.zip,
          shippingCountry: shipping?.country,
          paymentMethod,
          customerName,
          customerEmail,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });

      // 2. Update product stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newOrder;
    });

    console.log(`[ORDER] Successfully created order ${order.id}`);
    
    // Optional: Revalidate paths if needed
    revalidatePath("/shop");
    revalidatePath("/orders");
    
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("[ORDER ERROR] Failed to create order:", error);
    return { success: false, error: "Failed to process order. Please try again." };
  }
}

