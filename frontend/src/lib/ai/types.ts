export interface ConversationState {
  pending_confirmation?: string | null;
  pending_order_summary?: string | {
    text?: string;
    product_name: string;
    name?: string;
    imageUrl?: string;
    details?: string;
    price: number;
    amount?: number;
    estimated_delivery?: string;
  } | null;
  pending_yes_no?: string | null;
  pending_checkout?: {
    items: Array<{
      product_name: string;
      name?: string;
      price: number;
      amount?: number;
      quantity: number;
      imageUrl?: string;
      details?: string;
    }>;
  } | null;
  pending_product_list?: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    category?: string;
  }> | null;
  pending_tracking_data?: any | null;
  [key: string]: unknown;
}
