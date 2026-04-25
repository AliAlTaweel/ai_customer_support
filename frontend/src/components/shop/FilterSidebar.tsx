"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterSidebarProps {
  categories: string[];
}

interface FilterContentProps {
  categories: string[];
  currentCategory: string;
  setCategory: (category: string) => void;
}

const FilterContent = ({ categories, currentCategory, setCategory }: FilterContentProps) => (
  <div className="flex flex-col gap-8">
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Categories
      </h3>
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          className={cn(
            "justify-start h-12 rounded-2xl transition-all font-medium",
            currentCategory === "all"
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              : "hover:bg-secondary"
          )}
          onClick={() => setCategory("all")}
        >
          All Products
        </Button>
        {categories.map((category) => {
          const label = category
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" & ");

          return (
            <Button
              key={category}
              variant="ghost"
              className={cn(
                "justify-start h-12 rounded-2xl transition-all font-medium",
                currentCategory === category
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  : "hover:bg-secondary"
              )}
              onClick={() => setCategory(category)}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>

    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Filter by Price
      </h3>
      <p className="text-xs text-muted-foreground italic">
        Additional filters coming soon...
      </p>
    </div>
  </div>
);

export function FilterSidebar({ categories }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") || "all";

  const setCategory = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 sticky top-24 h-[calc(100vh-8rem)]">
        <ScrollArea className="h-full pr-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Filter className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Filters</h2>
            </div>
            <FilterContent 
              categories={categories} 
              currentCategory={currentCategory} 
              setCategory={setCategory} 
            />
          </div>
        </ScrollArea>
      </aside>

      {/* Mobile Filter Button */}
      <div className="lg:hidden sticky top-20 z-40 bg-background/80 backdrop-blur-md py-4 border-b">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" className="w-full h-12 rounded-2xl gap-2 border-primary/20">
                <Filter className="w-4 h-4" />
                Filters
                {currentCategory !== "all" && (
                  <Badge variant="default" className="ml-2 rounded-full h-5 w-5 p-0 flex items-center justify-center">
                    1
                  </Badge>
                )}
              </Button>
            }
          />
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
             <div className="flex flex-col gap-6 mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight">Filters</h2>
                  {currentCategory !== "all" && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs rounded-full"
                      onClick={() => setCategory("all")}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
            <FilterContent 
                categories={categories} 
                currentCategory={currentCategory} 
                setCategory={setCategory} 
            />
             </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
