import { Product } from '@/lib/db';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <Card className="flex flex-col h-full overflow-hidden hover-lift border-primary/10 bg-card/50 backdrop-blur-sm group">
      <div className="aspect-square relative bg-muted/30 flex items-center justify-center p-8 overflow-hidden group-hover:bg-primary/5 transition-colors duration-500">
        <ShoppingCart className="w-20 h-20 text-primary/10 group-hover:text-primary/20 transition-all duration-500 group-hover:scale-110" />
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            {product.category}
          </Badge>
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
        <Button onClick={() => addToCart(product)} className="w-full gap-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all">
          <ShoppingCart className="w-4 h-4" />
          Add to Basket
        </Button>
      </CardFooter>
    </Card>
  );
}
