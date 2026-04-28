# Luxe E-Commerce Frontend

A premium, high-performance storefront built with Next.js. This application serves as both the e-commerce interface and the chat portal for the AI Support Assistant.

## ✨ Features
- **Luxe UI**: A sleek, modern aesthetic tailored for high-end retail.
- **Full Checkout Flow**: Product browsing, cart management, and order placement.
- **AI Chat Widget**: A persistent sidebar chat that communicates with the agentic backend.
- **Secure Authentication**: Integrated with Clerk for JWT-based session management.
- **Shared Data**: Uses a local SQLite database that the AI backend also accesses to perform real-time actions.

---

## 🛠 Tech Stack
- **Next.js 15+**: (App Router)
- **TypeScript**: Type-safe development.
- **Tailwind CSS**: Modern, responsive styling.
- **Prisma**: Type-safe database access and migrations.
- **Lucide React**: Premium iconography.

---

## 🚦 Getting Started

### Installation
1.  **Dependencies**:
    ```bash
    cd frontend
    npm install
    ```

2.  **Database**:
    Initialize the SQLite database and generate the Prisma client:
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
The frontend chat component sends the conversation history along with the user's **JWT session token** to `http://localhost:3001/api/v1/chat`. This allows the AI backend to:
1.  Verify the user's identity.
2.  Provide personalized support (e.g., "Where is *my* order?").
3.  Enforce data privacy by masking PII and filtering database queries.

### Database Sharing
The database file is located at `prisma/dev.db`. The AI backend is configured to read/write to this same file, allowing the agents to see your products and manage your orders instantly.
