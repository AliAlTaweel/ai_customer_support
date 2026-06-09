"use server";

import { getPrisma } from "@/lib/db";
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
  } catch (error) {
    const err = error as Error;
    console.error("[ADMIN ERROR] Failed to fetch complaints:", err);
    return {
      success: false,
      error: `Failed to fetch complaints: ${err.message || "Unknown error"}`
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
  } catch (error) {
    const err = error as Error;
    console.error("[ADMIN ERROR] Failed to fetch transcript:", err);
    return { success: false, error: `Failed to fetch transcript: ${err.message}` };
  }
}

// ── Products CRUD Server Actions ───────────────────────────────────────────

export async function getAllProductsAdmin() {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, products };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to fetch products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

export async function createProduct(data: {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
  details?: string;
}) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: Number(data.price),
        category: data.category,
        stock: Number(data.stock),
        imageUrl: data.imageUrl || "/images/placeholder.png",
        details: data.details || "",
      },
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/shop");
    return { success: true, product };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to create product:", error);
    return { success: false, error: "Failed to create product" };
  }
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    imageUrl: string;
    details?: string;
  }
) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: Number(data.price),
        category: data.category,
        stock: Number(data.stock),
        imageUrl: data.imageUrl,
        details: data.details,
      },
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/shop");
    revalidatePath(`/shop/${id}`);
    return { success: true, product };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to update product:", error);
    return { success: false, error: "Failed to update product" };
  }
}

export async function deleteProduct(id: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    await prisma.product.delete({
      where: { id },
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/shop");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to delete product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}

// ── FAQs CRUD Server Actions ───────────────────────────────────────────────

export async function getAllFAQs() {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    const faqs = await prisma.fAQ.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, faqs };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to fetch FAQs:", error);
    return { success: false, error: "Failed to fetch FAQs" };
  }
}

export async function createFAQ(question: string, answer: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    const faq = await prisma.fAQ.create({
      data: { question, answer },
    });

    revalidatePath("/admin/dashboard");
    return { success: true, faq };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to create FAQ:", error);
    return { success: false, error: "Failed to create FAQ" };
  }
}

export async function updateFAQ(id: string, question: string, answer: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    const faq = await prisma.fAQ.update({
      where: { id },
      data: { question, answer },
    });

    revalidatePath("/admin/dashboard");
    return { success: true, faq };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to update FAQ:", error);
    return { success: false, error: "Failed to update FAQ" };
  }
}

export async function deleteFAQ(id: string) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const prisma = await getPrisma();
    await prisma.fAQ.delete({
      where: { id },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN ERROR] Failed to delete FAQ:", error);
    return { success: false, error: "Failed to delete FAQ" };
  }
}
