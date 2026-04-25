# Luxe E-Commerce Frontend

This directory contains the user-facing web application for the Luxe E-Commerce platform and AI Assistant interface.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (or similar utility-based styling for modern UI)
- **Database ORM**: Prisma Client
- **Database**: SQLite (`prisma/dev.db`)

## Features
- **Product Catalog & Cart**: Browse products, manage cart items, and proceed through a complete checkout flow.
- **Order Management**: Users can view their order IDs and details.
- **AI Support Chat**: An integrated chat interface that connects to the Python backend to provide intelligent, agentic customer support. The frontend maintains the chat history and state, sending it to the backend for processing.

## Setup & Running

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Database Setup
The project uses a local SQLite database located at `prisma/dev.db`.
To ensure your Prisma client is up to date with the schema:
```bash
npx prisma generate
```

### Running the Development Server
Start the Next.js development server:
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

## Connection to Backend
The frontend chat interface makes POST requests to the AI Backend, which typically runs on `http://localhost:3001/chat`. Ensure the backend server is running simultaneously for the AI Assistant to function.
