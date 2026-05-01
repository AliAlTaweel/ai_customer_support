"use client";

import Image from "next/image";
import { Product } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, CheckCircle2, ShieldCheck, Truck } from "lucide-react";
import { useCart } from "@/lib/store/useCart";

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailsModal({
  product,
  isOpen,
  onClose,
}: ProductDetailsModalProps) {
  const addItem = useCart((state) => state.addItem);

  if (!product) return null;

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(product.price);

  const categoryLabel = product.category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" & ");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-background/80 backdrop-blur-xl">
        <div className="grid md:grid-cols-2 h-full min-h-[500px]">
          {/* Image Section */}
          <div className="relative h-[300px] md:h-full bg-secondary/20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-full h-full"
            >
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />
            </motion.div>
            <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground shadow-lg border-none px-3 py-1 text-sm">
              {categoryLabel}
            </Badge>
          </div>

          {/* Content Section */}
          <div className="p-8 flex flex-col justify-between">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <DialogHeader className="p-0 mb-4">
                  <DialogTitle className="text-3xl font-bold">{product.name}</DialogTitle>
                  <DialogDescription className="text-lg font-medium text-primary mt-1">
                    {formattedPrice}
                  </DialogDescription>
                </DialogHeader>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  {product.description}
                </p>

                {product.details && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground/70 mb-3">
                      Specifications
                    </h4>
                    <ul className="grid grid-cols-1 gap-2">
                      {product.details.split(",").map((detail, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          {detail.trim()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 backdrop-blur-sm">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <div className="text-xs">
                      <p className="font-semibold">2 Year Warranty</p>
                      <p className="text-muted-foreground">Full protection</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 backdrop-blur-sm">
                    <Truck className="w-5 h-5 text-primary" />
                    <div className="text-xs">
                      <p className="font-semibold">Free Shipping</p>
                      <p className="text-muted-foreground">Global delivery</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-4 mt-auto pt-6 border-t"
            >
              <Button
                className="flex-1 h-12 text-lg font-semibold shadow-xl shadow-primary/20 group"
                onClick={() => {
                  addItem(product);
                  onClose();
                }}
              >
                Add to Cart
                <ShoppingCart className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Availability</p>
                <p className={`font-bold ${product.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
