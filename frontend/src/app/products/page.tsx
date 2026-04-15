import { getProducts } from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import { ShoppingBag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = getProducts();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
      <div className="flex flex-col gap-4 mb-12">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-extrabold tracking-tight">Products</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Browse our curated selection of high-quality products. Add your favorites to the basket and checkout securely.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.product_id} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-24 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h2 className="text-2xl font-bold mb-2">No products found</h2>
          <p className="text-muted-foreground">Check back later for new arrivals.</p>
        </div>
      )}
    </div>
  );
}
