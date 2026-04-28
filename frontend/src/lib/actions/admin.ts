"use server";

import prisma from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";
const SESSION_COOKIE = "admin_session";

export async function adminLogin(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return { success: true };
  }

  return { success: false, error: "Invalid username or password" };
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  revalidatePath("/admin");
}

export async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === "true";
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
