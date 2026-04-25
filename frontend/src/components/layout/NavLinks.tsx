"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinksProps {
  userId: string | null;
}

export function NavLinks({ userId }: NavLinksProps) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    ...(userId ? [{ href: "/orders", label: "My Orders" }] : []),
    { href: "#", label: "Support" },
  ];

  return (
    <>
      {links.map((link) => {
        const isActive = pathname === link.href;
        
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-medium px-4 py-1.5 rounded-full transition-all duration-300 relative",
              isActive 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {link.label}
            {isActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full" />
            )}
          </Link>
        );
      })}
    </>
  );
}
