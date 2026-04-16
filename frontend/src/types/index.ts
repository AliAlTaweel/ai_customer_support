export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IndexingStatus {
  status: 'Ready' | 'Not Indexed' | 'Indexing' | 'Error';
  db_path?: string;
  count?: number;
}

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  category: string;
  description: string;
  image_url: string;
}

export interface Order {
  order_id: number;
  customer_id: number;
  order_date: string;
  amount: number;
  category: string;
  status: string;
  payment_method: string;
  email: string;
  shipping_address: string;
  items_json: string;
}

export interface CheckoutResult {
  success: boolean;
  message?: string;
}
