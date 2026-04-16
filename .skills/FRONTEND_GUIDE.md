# Frontend Architecture Guide

This document describes the design, technology stack, and implementation details of the **Customer Support Portal** frontend.

## 🚀 Core Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Runtime**: Node.js / React 19
- **Authentication**: [Clerk](https://clerk.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Base UI](https://base-ui.com/), [Shadcn/UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Table Management**: [TanStack Table v8](https://tanstack.com/table)
- **Database (Server-side)**: [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)

---

## 📂 Project Structure

```text
frontend/
├── src/
│   ├── app/                # Next.js App Router (Routes & Pages)
│   │   ├── actions/        # Server Actions (Database & Auth logic)
│   │   ├── indexing/       # RAG Knowledge Management Page
│   │   ├── orders/         # User Orders History (Protected)
│   │   ├── products/       # Product Catalog
│   │   └── sign-in/up/     # Clerk Custom Auth Pages
│   ├── components/         # React Components
│   │   ├── ui/             # Reusable UI components (Buttons, Cards, etc.)
│   │   ├── Navigation.tsx  # Auth-aware navigation
│   │   ├── CartSheet.tsx   # Shopping cart slider
│   │   └── ChatWidget.tsx  # AI Assistant floating widget
│   ├── lib/                # Shared utilities & Database clients
│   └── types/              # TypeScript interfaces
├── public/                 # Static assets
└── .env                    # Environment variables (Clerk keys)
```

---

## 🛠️ Key Features & Implementation

### 1. Authentication (Clerk)
- **Middleware Protection**: Routes like `/orders` are protected using `clerkMiddleware`.
- **Custom Flow**: Integrated custom sign-in and sign-up pages using Clerk's pre-built components for a seamless UI.
- **Client-Side Auth**: The `Navigation` component uses `useUser()` to conditionally show the dashboard or login button.

### 2. Product Catalog & Cart
- **Dynamic Grid**: Products are displayed in a responsive grid using the `ProductCard` component.
- **Cart Context**: State is managed via `CartProvider.tsx` using the React Context API, enabling the cart to be accessible from any page (Products, Home, and the Side Sheet).

### 3. AI Support Chat
- **Streaming UI**: Found in `ChatWidget.tsx` and `IndexingPage.tsx`.
- **Backend Integration**: Communicates with the Python FastAPI backend (`http://localhost:8000/api/chat`) to provide RAG-powered answers.

### 4. Knowledge Indexing (RAG Admin)
- **Vector Store Sync**: A dedicated interface for admins to trigger the indexing of FAQ documents into the vector store.
- **Real-time Logs**: Uses a terminal-style UI to show the progress of the `nomic-embed-text` embedding process.

### 5. Order Management
- **Local DB Integration**: Uses `better-sqlite3` within **Next.js Server Actions** to fetch and store order data directly in the local `mvp.db` database.

---

## 🏗️ Technical Architecture Details

### Server Actions
We use Next.js Server Actions (e.g., in `src/app/actions/checkout.ts`) to handle form submissions and database mutations. This eliminates the need for manual API route management for internal database tasks.

### Styling System
- **Responsive Design**: Mobile-first approach using Tailwind utility classes.
- **Glassmorphism**: Cards and headers use `backdrop-blur-md` and semi-transparent backgrounds for a premium, modern feel.
- **Animations**: Subtle entry animations powered by `tailwindcss-animate`.

### API Strategy
- **Internal**: Server Actions communicate directly with SQLite.
- **External/AI**: Standard `fetch` calls are used to communicate with the FastAPI backend for AI-related tasks (Chat, Indexing).

---

## 🔧 Environment Setup

To run this frontend locally, you need a `.env` file with your Clerk credentials:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```
