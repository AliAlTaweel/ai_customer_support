"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
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
  <div className="flex flex-col gap-6">
    {/* Category List */}
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
        Categories
      </h3>
      <div className="flex flex-col gap-1.5">
        <Button
          variant="ghost"
          className={cn(
            "justify-start h-11 px-4 rounded-xl transition-all text-xs font-semibold scale-[0.98] active:scale-95",
            currentCategory === "all"
              ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/15"
              : "text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-white/10"
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
                "justify-start h-11 px-4 rounded-xl transition-all text-xs font-semibold scale-[0.98] active:scale-95",
                currentCategory === category
                  ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/10 dark:hover:bg-white/10"
              )}
              onClick={() => setCategory(category)}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>

    <div className="w-full h-px bg-border" />

    {/* Price Range Filter (Stitch Mockup Design placeholders) */}
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
        Price Range
      </h3>
      <div className="flex items-center gap-3">
        <input 
          type="number"
          placeholder="Min"
          className="w-full bg-input dark:bg-slate-900 border border-border rounded-lg px-3 py-2 text-foreground text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
        <span className="text-muted-foreground text-xs">-</span>
        <input 
          type="number"
          placeholder="Max"
          className="w-full bg-input dark:bg-slate-900 border border-border rounded-lg px-3 py-2 text-foreground text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      </div>
    </div>

    <div className="w-full h-px bg-border" />

    {/* Availability (Stitch Mockup Design placeholders) */}
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
        Availability
      </h3>
      <div className="space-y-3 pt-1">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input 
            type="radio" 
            name="availability" 
            defaultChecked 
            className="form-radio h-4 w-4 text-primary bg-[#0b0f10] border-white/10 focus:ring-primary focus:ring-offset-background"
          />
          <span className="text-xs text-foreground group-hover:text-primary transition-colors">In Stock</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input 
            type="radio" 
            name="availability" 
            className="form-radio h-4 w-4 text-primary bg-[#0b0f10] border-white/10 focus:ring-primary focus:ring-offset-background"
          />
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Pre-order</span>
        </label>
      </div>
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
        <div className="h-full glass-panel rounded-2xl p-6 border border-white/10 glow-shadow">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Filter className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold font-outfit tracking-tight text-foreground">Filters</h2>
            </div>
            <FilterContent 
              categories={categories} 
              currentCategory={currentCategory} 
              setCategory={setCategory} 
            />
          </div>
        </div>
      </aside>

      {/* Mobile Filter Button */}
      <div className="lg:hidden sticky top-20 z-40 bg-background/80 backdrop-blur-md py-4 border-b">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full h-12 rounded-2xl gap-2 border-white/10 bg-card/50 dark:bg-white/5 hover:bg-primary/10 transition-colors">
              <Filter className="w-4 h-4 text-primary" />
              Filters
              {currentCategory !== "all" && (
                <Badge variant="default" className="ml-2 rounded-full h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground">
                  1
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-background/95 backdrop-blur-2xl border-r border-white/10">
            <div className="flex flex-col gap-6 mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-outfit tracking-tight">Filters</h2>
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
