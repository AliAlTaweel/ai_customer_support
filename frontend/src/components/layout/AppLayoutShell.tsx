"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Shield, HelpCircle, Layers, ChevronRight, Menu } from "lucide-react";
import { SignInButton, SignUpButton, UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { CartSheet } from "@/components/shop/CartSheet";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NavLinks } from "@/components/layout/NavLinks";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface AppLayoutShellProps {
  children: React.ReactNode;
  userId: string | null;
  isAdmin: boolean;
}

export function AppLayoutShell({ children, userId, isAdmin }: AppLayoutShellProps) {
  const pathname = usePathname();
  
  // Exclude checkout flows and sign-in/up routes from the global shell completely.
  // Exclude admin dashboard only from the global left sidebar.
  const excludeEntireLayout = 
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up");

  const excludeSidebar = pathname === "/" || pathname?.startsWith("/admin");

  if (excludeEntireLayout) {
    return <>{children}</>;
  }

  const sidebarLinks = [
    ...(isAdmin ? [{ href: "/admin/dashboard", label: "Admin Portal", icon: Shield }] : []),
    { href: "/support", label: "Support Center", icon: HelpCircle },
    { href: "/architecture", label: "Architecture", icon: Layers },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── GLOBAL TOP HEADER NAVBAR ── */}
      <header className="fixed top-0 w-full z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
          {/* Logo - Premium styling */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
            <div className="w-10 sm:w-11 h-10 sm:h-11 rounded-lg bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300">
              <span className="text-white font-bold text-lg sm:text-2xl">✨</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-lg sm:text-xl font-bold text-foreground hidden sm:inline leading-tight">LuxeAI</span>
              <span className="text-[10px] sm:text-xs font-medium text-primary uppercase tracking-wider">AI Support</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 ml-auto mr-auto">
            <NavLinks userId={userId} isAdmin={isAdmin} />
          </nav>

          {/* Mobile Menu */}
          <div className="flex lg:hidden ml-auto flex-shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-primary/5 rounded-lg">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px] bg-background border-border pt-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col gap-6 pt-6">
                  <Link href="/" className="flex items-center gap-2 px-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center">
                      <span className="text-white font-bold text-lg">✨</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-lg font-bold text-foreground leading-tight">LuxeAI</span>
                      <span className="text-[9px] font-medium text-primary uppercase tracking-wider">AI Support</span>
                    </div>
                  </Link>
                  <nav className="flex flex-col gap-2 px-2">
                    <NavLinks userId={userId} isAdmin={isAdmin} />
                  </nav>
                  <div className="h-[1px] bg-border" />
                  <div className="flex flex-col gap-2 px-2">
                    <Link href="/support" className="text-sm font-medium px-3 py-2.5 text-foreground hover:bg-primary/5 rounded-lg transition-colors">Support Center</Link>
                    <Link href="/architecture" className="text-sm font-medium px-3 py-2.5 text-foreground hover:bg-primary/5 rounded-lg transition-colors">Architecture</Link>
                    {isAdmin && (
                      <Link href="/admin/dashboard" className="text-sm font-medium px-3 py-2.5 text-primary hover:bg-primary/5 rounded-lg transition-colors">Admin Portal</Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Right Actions - Premium styling */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="hidden sm:flex">
              <CartSheet />
            </div>

            <div className="w-[1px] h-6 bg-border hidden sm:block" />

            <ThemeToggle />

            {!userId ? (
              <div className="hidden sm:flex items-center gap-2">
                <SignInButton mode="modal">
                  <Button variant="ghost" className="text-sm font-medium px-3 py-2 hover:bg-primary/5 rounded-lg">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="text-sm font-medium px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-md shadow-primary/20 transition-all duration-200">Sign Up</Button>
                </SignUpButton>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:block">
                  <OrganizationSwitcher
                    appearance={{
                      elements: {
                        rootBox: "flex items-center justify-center text-sm font-medium",
                        organizationSwitcherTrigger: "border border-border rounded-lg px-3 py-1.5 bg-input text-foreground hover:bg-input/80 transition-colors text-xs sm:text-sm"
                      }
                    }}
                  />
                </div>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-9 sm:h-10 w-9 sm:w-10 rounded-full border border-border"
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── CONTENT BODY WITH SIDEBAR ── */}
      <div className="flex flex-1 pt-16 sm:pt-20 bg-background relative">
        {/* ── LEFT SIDE LIST SIDEBAR ── */}
        {!excludeSidebar && (
          <aside className="w-72 bg-sidebar border-r border-border pt-6 pb-8 px-4 shrink-0 hidden lg:flex flex-col gap-8 sticky top-16 sm:top-20 h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] z-30">
            <div className="px-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Navigation
              </span>
            </div>
            <nav className="flex flex-col gap-1">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-primary/5"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Info Card */}
            <div className="mt-auto p-4 rounded-lg border border-border bg-card flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">System Status</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI-powered support loops and PII scrubbers are fully operational.
              </p>
            </div>
          </aside>
        )}

        {/* ── MAIN CONTENT WORKSPACE ── */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
