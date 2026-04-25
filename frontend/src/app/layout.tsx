import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClerkProvider, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { CartSheet } from "@/components/shop/CartSheet";
import Link from "next/link";
import { NavLinks } from "@/components/layout/NavLinks";
import ChatInterface from "@/components/chat/ChatInterface";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "LuxeCatalog | High-End Product Discovery",
  description: "Experience the future of e-commerce with our premium Bento-inspired product catalog.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body
          suppressHydrationWarning
          className={cn(
            "min-h-screen bg-background font-sans antialiased selection:bg-primary/30",
            inter.variable,
            outfit.variable
          )}
        >
          <header className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl font-outfit">L</span>
                </div>
                <span className="text-xl font-bold font-outfit tracking-tight">LuxeCatalog</span>
              </div>
              <nav className="hidden md:flex items-center gap-1 bg-secondary/30 p-1 rounded-full border border-primary/5">
                <NavLinks userId={userId} />
              </nav>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex h-10 px-4 items-center rounded-full bg-secondary text-sm text-muted-foreground mr-2">
                  Search products...
                </div>
                
                <CartSheet />
                
                {!userId ? (
                  <div className="flex items-center gap-2">
                    <SignInButton mode="modal">
                      <button className="text-sm font-medium px-4 py-2 rounded-full hover:bg-secondary transition-colors">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="text-sm font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <UserButton 
                      appearance={{
                        elements: {
                          avatarBox: "h-10 w-10 rounded-full border-2 border-primary/20"
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="pt-20">
            {children}
          </main>
          <ChatInterface />
        </body>
      </html>
    </ClerkProvider>
  );
}
