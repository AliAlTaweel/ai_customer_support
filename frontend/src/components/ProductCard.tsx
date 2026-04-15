'use client';

import { Product } from '@/lib/db';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from './CartProvider';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price);

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video relative bg-muted flex items-center justify-center p-8 overflow-hidden">
        <ShoppingCart className="w-16 h-16 text-muted-foreground opacity-20" />
        <div className="absolute top-2 right-2">
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            {product.category}
          </span>
        </div>
      </div>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg leading-tight line-clamp-1">{product.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {product.description}
        </p>
        <div className="text-xl font-bold">{formattedPrice}</div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button onClick={() => addToCart(product)} className="w-full gap-2">
          <ShoppingCart className="w-4 h-4" />
          Add to Basket
        </Button>
      </CardFooter>
    </Card>
  );
}
