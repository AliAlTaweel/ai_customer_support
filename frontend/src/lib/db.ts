import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), '..', 'db', 'mvp.db');
const db = new Database(dbPath, { verbose: console.log });

export interface Customer {
  customer_id: number;
  email: string;
  name: string;
  signup_date: string;
  country: string;
}

export interface Order {
  order_id: number;
  customer_id: number;
  order_date: string;
  amount: number;
  category: string;
  status: string;
  payment_method: string;
  email?: string;
  shipping_address?: string;
  items_json?: string;
}

export interface Product {
  product_id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

export function getCustomerByEmail(email: string): Customer | undefined {
  const stmt = db.prepare('SELECT * FROM customers WHERE email = ?');
  return stmt.get(email) as Customer | undefined;
}

export function getOrdersByCustomerId(customerId: number): Order[] {
  const stmt = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC');
  return stmt.all(customerId) as Order[];
}

export function getProducts(): Product[] {
  const stmt = db.prepare('SELECT * FROM products');
  return stmt.all() as Product[];
}

export function createOrder(order: Omit<Order, 'order_id'>): number {
  const stmt = db.prepare(`
    INSERT INTO orders (customer_id, order_date, amount, category, status, payment_method, email, shipping_address, items_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    order.customer_id,
    order.order_date,
    order.amount,
    order.category,
    order.status,
    order.payment_method,
    order.email,
    order.shipping_address,
    order.items_json
  );
  
  return info.lastInsertRowid as number;
}

export function deleteOrder(orderId: number): void {
  const stmt = db.prepare('DELETE FROM orders WHERE order_id = ?');
  stmt.run(orderId);
}

export default db;
