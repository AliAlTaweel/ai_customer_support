"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { OrderId } from "@/components/orders/order-id";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl bg-secondary/30 backdrop-blur-xl border border-primary/10 rounded-[2.5rem] p-10 md:p-16 text-center shadow-2xl relative overflow-hidden"
      >
        {/* Abstract Background Decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold font-outfit tracking-tight">
              Order Confirmed
            </h1>
            <p className="text-muted-foreground text-lg max-w-sm mx-auto">
              Your luxury collection is being prepared. We've sent a confirmation email with all the details.
            </p>
          </div>


          {orderId && (
            <div className="py-3 px-6 rounded-full bg-primary/5 border border-primary/10 flex items-center gap-3">
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Order ID</span>
              <OrderId id={orderId} />
            </div>
          )}

          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/10 to-transparent my-4" />

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <Link href="/shop" className="w-full">
              <Button className="w-full h-14 rounded-2xl text-lg font-semibold shadow-xl shadow-primary/20 group">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Continue Shopping
              </Button>
            </Link>
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full h-14 rounded-2xl text-lg font-semibold border-primary/10 hover:bg-primary/5 group">
                Back to Home
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="mt-12 text-sm text-muted-foreground italic"
      >
        Thank you for choosing LuxeCatalog. Premium design, delivered.
      </motion.p>
    </div>
  );
}
