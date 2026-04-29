# Luxe E-Commerce Frontend

A premium, high-performance storefront built with Next.js. This application serves as both the e-commerce interface and the chat portal for the AI Support Assistant.

## ✨ Features
- **Luxe UI**: A sleek, modern aesthetic tailored for high-end retail.
- **Full Checkout Flow**: Product browsing, cart management, and order placement.
- **AI Chat Widget**: A persistent sidebar chat that communicates with the agentic backend.
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
    ```

### Running the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗 Interaction with AI Backend
The frontend chat component sends the conversation history along with the user's **Clerk JWT session token** to `http://localhost:3001/api/v1/chat`. This allows the AI backend to:
1.  Verify the user's identity securely.
2.  Provide personalized support (e.g., "Where is *my* order?").
3.  Enforce data privacy by masking PII and filtering database queries.

### Shared Infrastructure
The system uses a unified **AWS RDS PostgreSQL** database. Both the frontend (via Prisma) and the AI backend (via SQLAlchemy) connect to this instance, ensuring that AI agents have real-time access to products, orders, and user data.
