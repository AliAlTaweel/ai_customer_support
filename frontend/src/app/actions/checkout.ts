'use server';

import { currentUser } from '@clerk/nextjs/server';
import { getCustomerByEmail, createOrder, Order } from '@/lib/db';
import { redirect } from 'next/navigation';
import { CartItem, CheckoutResult } from '@/types';

export async function checkoutAction(formData: FormData, cartItems: CartItem[], total: number): Promise<CheckoutResult> {
  const user = await currentUser();

  if (!user) {
    throw new Error('You must be signed in to checkout');
  }

  const email = user.emailAddresses[0]?.emailAddress;
  const address = formData.get('address') as string;

  if (!email || !address) {
    throw new Error('Invalid email or address');
  }

  const customer = getCustomerByEmail(email);
  if (!customer) {
    throw new Error('No matching customer profile found. Please contact support.');
  }

  const orderData: Omit<Order, 'order_id'> = {
    customer_id: customer.customer_id,
    order_date: new Date().toISOString(),
    amount: total,
    category: 'electronics', // Default category for products
    status: 'pending',
    payment_method: 'credit_card', // Placeholder
    email: email,
    shipping_address: address,
    items_json: JSON.stringify(cartItems)
  };

  createOrder(orderData);

  // We can't redirect directly inside a try/catch if we want to use server actions in some setups,
  // but for Next.js 15 this is fine.
  return { success: true };
}
