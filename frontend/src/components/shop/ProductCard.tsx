"use client";

import Image from "next/image";
import { Product } from "@prisma/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Eye } from "lucide-react";
import { useCart } from "@/lib/store/useCart";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCart((state) => state.addItem);
  
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(product.price);

  const categoryLabel = product.category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" & ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-none bg-secondary/30 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 group">
        <CardContent className="p-0 relative aspect-square overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
            <Button size="icon" variant="secondary" className="rounded-full">
              <Eye className="w-5 h-5" />
            </Button>
            <Button 
              size="icon" 
              variant="default" 
              className="rounded-full shadow-lg shadow-primary/20 hover:scale-110 transition-transform"
              onClick={() => addItem(product)}
            >
              <ShoppingCart className="w-5 h-5" />
            </Button>
          </div>
          <Badge className="absolute top-4 left-4 bg-background/80 backdrop-blur-md border-none text-foreground">
            {categoryLabel}
          </Badge>
        </CardContent>
        <CardFooter className="p-5 flex flex-col items-start gap-1">
          <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
          <p className="text-muted-foreground text-sm line-clamp-2 min-h-[40px]">
            {product.description}
          </p>
          <div className="mt-4 flex items-center justify-between w-full">
            <span className="text-xl font-bold text-primary">{formattedPrice}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
