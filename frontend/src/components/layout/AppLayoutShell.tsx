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

  const excludeSidebar = pathname?.startsWith("/admin");

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
      <header className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl font-outfit">L</span>
              </div>
              <span className="text-xl font-bold font-outfit tracking-tight text-foreground">LuxeCatalog</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-1 bg-secondary/30 p-1 rounded-full border border-primary/5">
            <NavLinks userId={userId} isAdmin={isAdmin} />
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
                    <NavLinks userId={userId} isAdmin={isAdmin} />
                    <div className="h-[1px] bg-border my-2" />
                    <Link href="/support" className="text-sm font-medium px-4 py-2 hover:bg-secondary rounded-full">Support Center</Link>
                    <Link href="/architecture" className="text-sm font-medium px-4 py-2 hover:bg-secondary rounded-full">Architecture</Link>
                    {isAdmin && (
                      <Link href="/admin/dashboard" className="text-sm font-medium px-4 py-2 hover:bg-secondary rounded-full text-primary">Admin Portal</Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex items-center gap-4">
            <CartSheet />
            <ThemeToggle />
            
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
                <OrganizationSwitcher 
                  appearance={{
                    elements: {
                      rootBox: "flex items-center justify-center text-sm font-medium",
                      organizationSwitcherTrigger: "border border-primary/20 rounded-full px-3 py-1 bg-secondary text-foreground hover:bg-secondary/80 transition-colors h-10"
                    }
                  }}
                />
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

      {/* ── CONTENT BODY WITH SIDEBAR ── */}
      <div className="flex flex-1 pt-20 bg-background relative">
        {/* ── LEFT SIDE LIST SIDEBAR ── */}
        {!excludeSidebar && (
          <aside className="w-64 bg-card/25 backdrop-blur-md border-r border-border/60 pt-8 pb-8 px-4 shrink-0 hidden md:flex flex-col gap-6 sticky top-20 h-[calc(100vh-80px)] z-30">
            <div className="px-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/85 font-mono">
                Platform Resources
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            </div>
            <nav className="flex flex-col gap-1.5">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "group flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-300 border border-transparent",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15 border-primary/20 scale-[1.01]"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 hover:border-secondary-foreground/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight className={cn(
                      "w-3.5 h-3.5 opacity-0 -translate-x-1 transition-all duration-300",
                      isActive ? "opacity-100 translate-x-0 text-primary-foreground" : "group-hover:opacity-40 group-hover:translate-x-0"
                    )} />
                  </Link>
                );
              })}
            </nav>

            {/* Floating Accent card */}
            <div className="mt-auto p-4 rounded-3xl bg-secondary/25 border border-primary/5 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-primary/10 blur-xl" />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold font-mono">System Integrity</span>
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                Autonomous support loops and presidio PII scrubbers are operational.
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
