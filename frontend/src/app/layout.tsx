import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

import { CartProvider } from "@/components/CartProvider";
import CartSheet from "@/components/CartSheet";
import ChatWidget from "@/components/ChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Customer Support Portal",
  description: "Manage your orders and get AI-powered support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <CartProvider>
        <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
          <body className="min-h-screen bg-background font-sans antialiased">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-16 items-center justify-between mx-auto px-4 x-sm:px-6 lg:px-8">
                <div className="flex items-center gap-6">
                  <Link href="/" className="flex items-center space-x-2">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                    <span className="font-bold inline-block text-xl tracking-tight">SupportPortal</span>
                  </Link>
                  <nav className="flex items-center space-x-6 text-sm font-medium">
                    <Link href="/" className="transition-colors hover:text-primary text-foreground/60">Home</Link>
                    <Link href="/products" className="transition-colors hover:text-primary text-foreground/60">Products</Link>
                    <Link href="/orders" className="transition-colors hover:text-primary text-foreground/60">Orders</Link>
                    <Link href="/indexing" className="transition-colors hover:text-primary text-foreground/60">Indexing</Link>
                  </nav>
                </div>
                <div className="flex items-center gap-4">
                  <CartSheet />
                  <Navigation />
                </div>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <ChatWidget />
          </body>
        </html>
      </CartProvider>
    </ClerkProvider>
  );
}
