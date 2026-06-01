# Luxe E-Commerce Frontend

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Shadcn%20UI-Modernized-000000?style=for-the-badge&logo=shadcnui&logoColor=white" alt="Shadcn UI" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-Modern-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" alt="Clerk" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
</p>

A premium, high-performance storefront built with Next.js 16. This application serves as both the e-commerce interface and the chat portal for the AI Support Assistant.

---

## ✨ Features

- **Luxe UI Overhaul**: A sleek, modern aesthetic tailored for high-end retail, fully modernized with **Shadcn UI** components.
- **Shadcn UI Architecture**: Clean, reusable components throughout the app:
  - `Button` & `Input` components used in the newsletter subscription, CartSheet, and order details.
  - `Dialog` (Modal) and `Sheet` structures used for secure forms, checkout, and sidebars.
  - `Badge`, `Tabs`, `Card`, and `Separator` components used for status updates and structured item grids.
- **Refined Checkout Flow**: Interactive checkout process with dynamic product cards and real-time order confirmation.
- **AI Chat Widget**: A persistent sidebar chat communicating with the agentic backend. 
  - **Onboarding Quick Replies**: Greets users instantly with four interactive glassmorphic cards (*Track Order*, *Browse Products*, *Cancel Order*, and *File Complaint*), eliminating "blank page syndrome" and triggering fast-tracked non-LLM responses.
  - **Auto-Dismiss Grid**: Conditional rendering hides the grid as soon as active custom messages begin, maintaining a clean chat log.
  - **"New Chat" (+) Header Button**: Resets the chat history, greeting state, and active signals instantly, re-triggering the animated quick reply onboarding.
- **AI Chat Widget**: A persistent sidebar chat communicating with the agentic backend. 
  - **Onboarding Quick Replies**: Greets users instantly with four interactive glassmorphic cards (*Track Order*, *Browse Products*, *Cancel Order*, and *File Complaint*), eliminating "blank page syndrome" and triggering fast-tracked non-LLM responses.
  - **Auto-Dismiss Grid**: Conditional rendering hides the grid as soon as active custom messages begin, maintaining a clean chat log.
  - **"New Chat" (+) Header Button**: Resets the chat history, greeting state, and active signals instantly, re-triggering the animated quick reply onboarding.
  - **Visual Shipments & Maps**: Renders active shipment progress bars and interactive maps inside chat bubbles via structured `TRACKING_INFO` payloads.
- **Tenant Admin Dashboard (`/dashboard`)**: A premium dashboard displaying copy-pasteable script tags for widget integration, Clerk active workspace stats, and domain whitelisting safety notices.
- **Knowledge Base Manager (`/dashboard/knowledge-base`)**: An interactive drag-and-drop dropzone UI allowing tenant administrators to upload documentation (Markdown, CSV, PDF, TXT), search indexed chunks, and wipe pgvector database embeddings.
- **Secure Authentication**: Integrated with **Clerk** for multi-factor authentication, secure session management, and custom proxy domain compatibility.
- **Cloud Database**: Powered by **Supabase PostgreSQL** with Prisma for production-grade reliability and shared access with the AI backend.

---

## 🛠 Tech Stack

- **Next.js 16+** (App Router)
- **TypeScript**: Type-safe development
- **Shadcn UI**: Beautifully designed primitive components
- **Tailwind CSS**: Modern, responsive styling
- **Prisma**: Type-safe database access and migrations for PostgreSQL
- **Clerk**: Robust authentication and user management
- **Lucide React**: Premium iconography

---

## 🚦 Getting Started

### Installation

1. **Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Variables**:
   Create a `.env` file with your `DATABASE_URL` pointing to your Supabase instance, and your Clerk API keys:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
   CLERK_SECRET_KEY=your_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```

3. **Database Setup**:
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

The frontend chat component sends the conversation history along with the user's **Clerk JWT session token** to the backend API.

1. **Relative API Gateway Proxying**: To prevent HTTPS Mixed Content errors, client-side requests are dynamically routed to relative `/api/v1/...` endpoints, rewritten under-the-hood in `next.config.ts` to forward securely to the production Nginx/HTTPS gateway (`https://ali-support.duckdns.org`).
2. **Fast-Routing**: Immediate handling of simple requests and FAQ inquiries without backend orchestration overhead.
3. **Signal Parsing**: Robust handling of backend signals (`CHECKOUT_REQUIRED`, `PLACE_ORDER_SUMMARY`, `TRACKING_INFO`) to render interactive UI components, progress indicators, and shipment maps directly in the chat.
4. **Middleware Security Hardening**: Built-in protection against information disclosure in [proxy.ts](file:///Users/alial-taweel/projects/ai/ai_customer_support_v3/frontend/src/proxy.ts) by scrubbing environment variable keys (`envKeys`) and raw server-side stack traces from client-facing 500 responses.
5. **Real-time GDPR Masking**: Ensuring user privacy through pseudonymization at the API layer.

### Shared Infrastructure
The system uses a unified **Supabase PostgreSQL** database. Both the frontend (via Prisma) and the AI backend (via SQLAlchemy) connect to this instance, ensuring that AI agents have real-time access to products, orders, and user data with high-performance query execution.
