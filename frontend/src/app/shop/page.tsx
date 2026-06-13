import { getProducts, getCategories } from "@/lib/actions/products";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { FilterSidebar } from "@/components/shop/FilterSidebar";
import { Badge } from "@/components/ui/badge";

interface ShopPageProps {
  searchParams: Promise<{
    category?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { category } = await searchParams;
  const products = await getProducts(category);
  const categories = await getCategories();

  return (
    <div className="container mx-auto px-4 py-12 relative z-10 overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 radial-glow-bg -z-10 opacity-30 pointer-events-none" />

      <div className="flex flex-col gap-4 mb-12">
        <div className="flex items-center gap-3">
          <Badge className="rounded-full px-4 py-1.5 border border-primary/20 bg-primary/10 text-primary font-bold text-[10px] tracking-widest uppercase">
            Store Catalog
          </Badge>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold font-outfit tracking-tight text-foreground glow-text">
          Find your perfect <span className="text-primary italic">match.</span>
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
          Explore our curated selection of high-quality products across multiple categories. 
          Each item is handpicked for its design and performance.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <FilterSidebar categories={categories} />
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono">
              Showing <span className="text-primary font-bold">{products.length}</span> products
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono">Sort by:</span>
              <select className="bg-input border border-border rounded-lg px-4 py-2 text-foreground text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer dark:bg-slate-900/80">
                <option>Newest</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>
          </div>
          
          <ProductGrid products={products} />
          
          {products.length > 0 && (
            <div className="mt-20 text-center">
              <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase font-mono">
                You&apos;ve reached the end of our current selection.
              </p>
              <div className="mt-4 flex items-center justify-center gap-4">
                <div className="h-[1px] w-12 bg-border/40" />
                <div className="w-2 h-2 rounded-full bg-primary/30" />
                <div className="h-[1px] w-12 bg-border/40" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
