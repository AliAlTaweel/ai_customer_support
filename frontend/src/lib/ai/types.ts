export interface ConversationState {
  pending_confirmation?: string | null;
  pending_order_summary?: string | {
    text?: string;
    product_name: string;
    imageUrl?: string;
    details?: string;
    price: number;
  } | null;
  pending_yes_no?: string | null;
  pending_checkout?: {
    items: Array<{
      product_name: string;
      price: number;
      quantity: number;
      imageUrl?: string;
      details?: string;
    }>;
  } | null;
  [key: string]: unknown;
}
