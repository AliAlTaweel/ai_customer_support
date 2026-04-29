"use server";

import prisma from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

import { currentUser } from "@clerk/nextjs/server";

export async function adminLogout() {
  revalidatePath("/admin");
}

export async function isAdmin() {
  try {
    const user = await currentUser();
    if (user) {
      const email = user.emailAddresses[0]?.emailAddress;
      return email?.toLowerCase() === ADMIN_EMAIL?.toLowerCase();
    }
  } catch (error) {
    console.error("Error checking Clerk user in isAdmin:", error);
  }

  return false;
}

export async function getAllOrders() {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, orders };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to fetch orders:", error);
    return { success: false, error: "Failed to fetch orders" };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to update status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function deleteOrder(orderId: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    await prisma.order.delete({
      where: { id: orderId },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to delete order:", error);
    return { success: false, error: "Failed to delete order" };
  }
}

export async function getAllComplaints() {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const complaints = await prisma.complaint.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Ensure proper serialization for Server Actions
    return {
      success: true,
      complaints: JSON.parse(JSON.stringify(complaints))
    };
  } catch (error: any) {
    console.error("[ADMIN ERROR] Failed to fetch complaints:", error);
    return {
      success: false,
      error: `Failed to fetch complaints: ${error.message || "Unknown error"}`
    };
  }
}

export async function updateComplaintStatus(complaintId: string, status: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    await prisma.complaint.update({
      where: { id: complaintId },
      data: { status },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to update complaint status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function deleteComplaint(complaintId: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    await prisma.complaint.delete({
      where: { id: complaintId },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to delete complaint:", error);
    return { success: false, error: "Failed to delete complaint" };
  }
}
