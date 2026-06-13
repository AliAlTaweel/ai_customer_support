"use client";

import Image from "next/image";
import { Product } from "../../generated/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Eye } from "lucide-react";
import { useCart } from "@/lib/store/useCart";

interface ProductCardProps {
  product: Product;
  onShowDetails: () => void;
}

export function ProductCard({ product, onShowDetails }: ProductCardProps) {
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
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onClick={onShowDetails}
      className="cursor-pointer h-full"
    >
      <Card className="overflow-hidden border border-border rounded-2xl group transition-all duration-500 hover:shadow-lg hover:shadow-primary/15 flex flex-col h-full bg-card dark:bg-slate-900/80">
        <CardContent className="p-0 relative aspect-[4/3] overflow-hidden bg-surface-dim shrink-0">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100 grayscale-[20%] group-hover:grayscale-0"
          />
          {/* Hover Actions overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-sm z-10">
            <Button 
              size="icon" 
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full p-3 h-12 w-12 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails();
              }}
            >
              <Eye className="w-5 h-5" />
            </Button>
            <Button 
              size="icon" 
              className="bg-primary/20 hover:bg-primary/45 border border-primary text-primary rounded-full p-3 h-12 w-12 transition-all cursor-pointer shadow-lg shadow-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                addItem(product);
              }}
            >
              <ShoppingCart className="w-5 h-5" />
            </Button>
          </div>
          <div className="absolute top-4 left-4 z-10">
            <Badge className="bg-black/40 dark:bg-black/60 backdrop-blur-md border border-primary/30 dark:border-primary/50 text-primary rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase">
              {product.stock > 0 ? "In Stock" : "Limited"}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="p-6 flex flex-col items-start gap-1 flex-1 min-h-[160px] relative">
          <div className="flex justify-between items-start w-full gap-4 mb-2">
            <h3 className="font-bold text-lg font-outfit text-foreground line-clamp-1 flex-1 min-w-0 group-hover:text-primary transition-colors duration-300">
              {product.name}
            </h3>
            <span className="font-bold text-lg font-outfit text-foreground group-hover:text-primary transition-colors shrink-0">
              {formattedPrice}
            </span>
          </div>
          <p className="text-muted-foreground text-sm line-clamp-2 min-h-[40px] leading-relaxed mb-4">
            {product.description}
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-2 w-full justify-between items-center border-t border-white/5">
            <span className="px-2 py-0.5 rounded border border-border text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-white/[0.02]">
              {categoryLabel}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {product.stock > 0 ? `${product.stock} left` : "Out of stock"}
            </span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
