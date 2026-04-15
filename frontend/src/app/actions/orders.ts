'use server';

import { deleteOrder } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deleteOrderAction(orderId: number) {
  try {
    deleteOrder(orderId);
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete order');
  }
}
