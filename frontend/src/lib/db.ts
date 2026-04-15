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
}

export function getCustomerByEmail(email: string): Customer | undefined {
  const stmt = db.prepare('SELECT * FROM customers WHERE email = ?');
  return stmt.get(email) as Customer | undefined;
}

export function getOrdersByCustomerId(customerId: number): Order[] {
  const stmt = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC');
  return stmt.all(customerId) as Order[];
}

export default db;
