"use client";

import Image from "next/image";
import { ShoppingCart, Trash2, Plus, Minus, ShoppingBag, Loader2 } from "lucide-react";
import { useCart, CartItem } from "@/lib/store/useCart";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createOrder } from "@/lib/actions/orders";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function CartSheet() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = totalItems();

  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(totalPrice());

  const handleCheckout = () => {
    if (items.length === 0) return;
    router.push("/checkout");
  };

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button className="relative h-10 w-10 flex items-center justify-center rounded-full bg-secondary/50 text-foreground transition-all hover:bg-secondary">
            <ShoppingCart className="w-5 h-5" />
            {mounted && count > 0 && (
              <Badge 
                suppressHydrationWarning
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] border-2 border-background"
              >
                {count}
              </Badge>
            )}
          </button>
        }
      />
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 border-l border-primary/10 bg-background/95 backdrop-blur-xl">
        <SheetHeader className="px-6 py-6 border-b border-primary/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </div>
            <SheetTitle className="text-xl font-bold font-outfit">Your Cart</SheetTitle>
            {mounted && count > 0 && (
              <span className="text-sm text-muted-foreground ml-2">({count} items)</span>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          {!mounted || items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Your cart is empty</h3>
                <p className="text-sm text-muted-foreground max-w-[200px] mt-1">
                  Start adding some luxury products to your collection.
                </p>
              </div>
              <SheetClose
                render={
                    <Button variant="outline" className="mt-4 rounded-full px-8">
                        Continue Shopping
                    </Button>
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-6">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </ScrollArea>

        {mounted && items.length > 0 && (
          <div className="p-6 border-t border-primary/5 bg-secondary/10 backdrop-blur-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-lg">{formattedTotal}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Shipping and taxes calculated at checkout.
              </p>
              <Button 
                className="w-full h-14 rounded-2xl text-lg font-semibold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleCheckout}
              >
                Checkout Now
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartItemRow({ item }: { item: CartItem }) {
  const { removeItem, updateQuantity } = useCart();

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(item.price);

  return (
    <div className="flex gap-4 group">
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border border-primary/5">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between py-1">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {item.name}
            </h4>
            <span className="text-xs text-muted-foreground capitalize">
              {item.category.replace("_", " & ")}
            </span>
          </div>
          <button
            onClick={() => removeItem(item.id)}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center bg-secondary/50 rounded-lg p-1 border border-primary/5">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="p-1 hover:bg-background rounded-md transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-xs font-medium">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="p-1 hover:bg-background rounded-md transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="font-semibold text-sm">{formattedPrice}</span>
        </div>
      </div>
    </div>
  );
}
