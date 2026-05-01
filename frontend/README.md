# Luxe E-Commerce Frontend

A premium, high-performance storefront built with Next.js. This application serves as both the e-commerce interface and the chat portal for the AI Support Assistant.

## ✨ Features
- **Luxe UI**: A sleek, modern aesthetic tailored for high-end retail.
- **Refined Checkout Flow**: Interactive checkout process with dynamic product cards and real-time order confirmation.
- **AI Chat Widget**: A persistent sidebar chat that communicates with the agentic backend. Now features **interactive UI signals** for seamless checkout and order summaries directly in the chat.
- **Expanded Catalog**: Includes premium electronics, high-end laptops, and luxury goods.
- **Secure Authentication**: Integrated with **Clerk** for multi-factor authentication and session management.
- **Cloud Database**: Powered by **AWS RDS PostgreSQL** for production-grade reliability and shared access with the AI backend.

---

## 🛠 Tech Stack
- **Next.js 15+**: (App Router)
- **TypeScript**: Type-safe development.
- **Tailwind CSS**: Modern, responsive styling.
- **Prisma**: Type-safe database access and migrations for PostgreSQL.
- **Clerk**: Robust authentication and user management.
- **Lucide React**: Premium iconography.

---

## 🚦 Getting Started

### Installation
1.  **Dependencies**:
    ```bash
    cd frontend
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file with your `DATABASE_URL` pointing to your AWS RDS instance and your Clerk keys.

3.  **Database**:
    Generate the Prisma client and sync the schema:
    ```bash
    npx prisma generate
    npx prisma db push
    # Optional: Seed the database with products
    npx prisma db seed
    ```

### Running the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗 Interaction with AI Backend
The frontend chat component sends the conversation history along with the user's **Clerk JWT session token** to the backend API. The system is optimized for **sub-5-second response times** through:
1.  **Fast-Routing**: Immediate handling of simple requests without backend overhead.
2.  **Unified Processing**: Single-pass agentic reasoning for complex tasks.
3.  **Signal Parsing**: Robust handling of backend signals (`CHECKOUT_REQUIRED`, `PLACE_ORDER_SUMMARY`) to render interactive UI components directly in the chat.
4.  **Real-time GDPR Masking**: Ensuring user privacy through pseudonymization at the API layer.

### Shared Infrastructure
The system uses a unified **AWS RDS PostgreSQL** database. Both the frontend (via Prisma) and the AI backend (via SQLAlchemy) connect to this instance, ensuring that AI agents have real-time access to products, orders, and user data with high-performance query execution.

