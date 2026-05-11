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
import { isAdmin } from "@/lib/actions/isAdmin";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArchitectureModal } from "@/components/layout/ArchitectureModal";

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
  try {
    let userId: string | null = null;
    let isUserAdmin = false;

    try {
      const authResult = await auth();
      userId = authResult?.userId || null;
      isUserAdmin = await isAdmin();
    } catch (error) {
      console.error("[LAYOUT ERROR] Failed to fetch auth state:", error);
    }

    return (
      <ClerkProvider proxyUrl={process.env.NEXT_PUBLIC_CLERK_PROXY_URL}>
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
                  <NavLinks userId={userId} isAdmin={isUserAdmin} />
                </nav>

                {/* Mobile Menu */}
                <div className="flex md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-secondary">
                        <Menu className="w-6 h-6" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-background border-r border-primary/10">
                      <SheetTitle className="sr-only">Menu</SheetTitle>
                      <div className="flex flex-col gap-6 pt-12">
                        <div className="flex items-center gap-2 px-4">
                          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-xl font-outfit">L</span>
                          </div>
                          <span className="text-xl font-bold font-outfit tracking-tight">LuxeCatalog</span>
                        </div>
                        <div className="flex flex-col gap-2 p-2">
                          <NavLinks userId={userId} isAdmin={isUserAdmin} />
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex h-10 px-4 items-center rounded-full bg-secondary text-sm text-muted-foreground mr-2">
                    Search products...
                  </div>
                  
                  <ArchitectureModal />
                  <CartSheet />
                  
                  {!userId ? (
                    <div className="flex items-center gap-2">
                      <SignInButton mode="modal">
                        <Button variant="ghost" className="text-sm font-medium px-4 py-2 rounded-full hover:bg-secondary transition-colors h-auto">Sign In</Button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <Button className="text-sm font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors h-auto">Sign Up</Button>
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
            <TooltipProvider>
              <main className="pt-20">
                {children}
              </main>
              <ChatInterface />
            </TooltipProvider>
          </body>
        </html>
      </ClerkProvider>
    );
  } catch (err: any) {
    const errorDetails = {
      message: err?.message || "Unknown error",
      stack: err?.stack || "No stack trace available",
      name: err?.name || "Error",
    };

    return (
      <html lang="en" className="dark">
        <head>
          <title>LuxeCatalog | Runtime Diagnostic</title>
        </head>
        <body className="min-h-screen bg-[#030712] text-slate-100 font-sans p-4 sm:p-8 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl p-6 sm:p-10 bg-[#1f2937]/50 border border-red-500/20 rounded-[2.5rem] shadow-2xl backdrop-blur-xl space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-white/5 pb-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 text-3xl">
                ⚠️
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-outfit text-white">LuxeCatalog Runtime Diagnostic</h1>
                <p className="text-sm text-slate-400 mt-1">An error occurred during server rendering of the RootLayout.</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Error Type & Message</span>
              <div className="p-5 bg-slate-950/80 rounded-2xl border border-white/5 text-red-400 font-mono text-sm font-semibold select-all leading-relaxed break-all">
                {errorDetails.name}: {errorDetails.message}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Traceback</span>
              <pre className="p-5 bg-slate-950/80 rounded-2xl border border-white/5 text-[11px] font-mono text-slate-300 overflow-auto max-h-[350px] select-all whitespace-pre-wrap leading-relaxed break-all">
                {errorDetails.stack}
              </pre>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              <div>Environment: {process.env.NODE_ENV || "unknown"}</div>
              <div>Date: {new Date().toISOString()}</div>
              <div>Server: AWS Amplify Hosting</div>
            </div>
          </div>
        </body>
      </html>
    );
  }
}
