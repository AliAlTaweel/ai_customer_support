"use server";

import { getPrisma } from "@/lib/db";
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
    const prisma = await getPrisma();
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

export async function updateOrderStatus(orderId: string, status: string, trackingNumber?: string, carrier?: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status,
        ...(trackingNumber && { trackingNumber }),
        ...(carrier && { carrier })
      },
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
    const prisma = await getPrisma();
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
    const prisma = await getPrisma();
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
    const prisma = await getPrisma();
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
    const prisma = await getPrisma();
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

export async function updateComplaintNotes(complaintId: string, internalNotes: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    await prisma.complaint.update({
      where: { id: complaintId },
      data: { internalNotes },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to update notes:", error);
    return { success: false, error: "Failed to update notes" };
  }
}

export async function assignComplaintAgent(complaintId: string, assignedTo: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    await prisma.complaint.update({
      where: { id: complaintId },
      data: { assignedTo },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to assign agent:", error);
    return { success: false, error: "Failed to assign agent" };
  }
}

export async function getComplaintTranscript(chatSessionId: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
  if (!chatSessionId) return { success: true, messages: [] };

  try {
    const prisma = await getPrisma();
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { userId: chatSessionId },
          { userName: chatSessionId }
        ]
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return {
      success: true,
      messages: JSON.parse(JSON.stringify(messages))
    };
  } catch (error: any) {
    console.error("[ADMIN ERROR] Failed to fetch transcript:", error);
    return { success: false, error: `Failed to fetch transcript: ${error.message}` };
  }
}
