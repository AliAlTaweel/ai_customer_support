import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/db";
import { Package, Clock, Check, CheckCircle2, Truck, ExternalLink, Calendar, Home, HelpCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrderId } from "@/components/orders/order-id";

export default async function OrdersPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-20 text-center relative z-10">
        <h1 className="text-2xl font-bold font-outfit text-foreground glow-text">Please sign in to view your orders.</h1>
      </div>
    );
  }

  const prisma = await getPrisma();
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl relative z-10">
      {/* Background Gradient Effect */}
      <div className="absolute inset-0 pointer-events-none z-[-1] radial-glow-bg opacity-30" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12 border-b border-white/5 pb-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold font-outfit tracking-tight text-foreground glow-text">
            Order Details
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage and track your luxury collection purchases.
          </p>
        </div>
        <div className="bg-card/40 dark:bg-white/5 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/10 flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono">Total Purchases: </span>
          <span className="text-base font-bold text-primary font-mono">{orders.length}</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="glass-panel rounded-[2.5rem] p-20 text-center flex flex-col items-center gap-6 border border-white/10 glow-shadow">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Package className="w-8 h-8 text-secondary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-outfit text-foreground">No orders found</h2>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-sm">
              You haven&apos;t made any purchases yet. Explore our luxury catalog to start your collection.
            </p>
          </div>
          <Button asChild className="h-12 px-8 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Link href="/shop">
              Go to Shop
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-16">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: any }) {
  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const subtotal = order.items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.085;
  const total = order.total;

  const formattedSubtotal = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(subtotal);
  const formattedTax = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(tax);
  const formattedTotal = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total);

  // Status mapping logic for Shipment Status tracker:
  // stages: Ordered -> Shipped -> In Transit -> Delivered
  const isCancelled = order.status === "CANCELLED";
  const isCompleted = order.status === "COMPLETED" || order.status === "DELIVERED";
  const isShipped = order.status === "SHIPPED";
  const isProcessing = order.status === "PROCESSING";
  
  // Progress line width mapping:
  let progressWidth = "0%";
  if (isCompleted) {
    progressWidth = "100%";
  } else if (isShipped) {
    progressWidth = "66%";
  } else if (isProcessing) {
    progressWidth = "33%";
  } else if (order.status === "PENDING") {
    progressWidth = "0%";
  }

  return (
    <div className="space-y-8">
      {/* Order Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <span className={cn(
            "px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-opacity-10 backdrop-blur-md",
            isCancelled 
              ? "border-red-500/40 text-red-400 bg-red-500" 
              : isCompleted 
                ? "border-green-500/40 text-green-400 bg-green-500" 
                : "border-secondary/20 text-secondary bg-secondary/10"
          )}>
            {order.status}
          </span>
          <span className="text-xs text-muted-foreground font-mono">Order <OrderId id={order.id} /></span>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
          <Calendar className="w-3.5 h-3.5 text-primary/60" />
          Placed on {formattedDate}
        </p>
      </div>

      {/* Shipment Status Timeline */}
      {!isCancelled && (
        <div className="glass-panel rounded-2xl p-8 md:p-10 relative overflow-hidden border border-white/10 glow-shadow-gold">
          <h3 className="text-sm font-bold uppercase tracking-widest text-secondary mb-10 font-mono">Shipment Status</h3>
          <div className="relative w-full">
            {/* Timeline Line Bar */}
            <div className="absolute top-6 left-6 right-6 h-[2px] bg-white/10 z-0 hidden md:block" />
            <div 
              className="absolute top-6 left-6 h-[2px] bg-gradient-to-r from-secondary to-[#e4ae00] z-10 transition-all duration-1000 hidden md:block" 
              style={{ width: `calc(${progressWidth} - 48px)` }}
            />

            {/* Timeline Steps */}
            <div className="flex flex-col md:flex-row justify-between relative z-10 gap-8 md:gap-0">
              {/* Step 1: Ordered */}
              <div className="flex flex-row md:flex-col items-center gap-4 md:gap-3 w-full md:w-1/4 relative">
                <div className="w-12 h-12 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 z-10 shadow-[0_0_15px_rgba(255,202,69,0.3)] border border-white/20">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div className="text-left md:text-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">Ordered</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{formattedDate}</p>
                </div>
              </div>

              {/* Step 2: Shipped */}
              <div className="flex flex-row md:flex-col items-center gap-4 md:gap-3 w-full md:w-1/4 relative">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 border transition-all duration-300",
                  isProcessing || isShipped || isCompleted
                    ? "bg-secondary text-on-secondary shadow-[0_0_15px_rgba(255,202,69,0.3)] border-white/20"
                    : "bg-muted text-muted-foreground border-white/5"
                )}>
                  {isProcessing || isShipped || isCompleted ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                <div className="text-left md:text-center">
                  <h4 className={cn(
                    "text-xs font-bold uppercase tracking-wider font-mono",
                    isProcessing || isShipped || isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}>Shipped</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {isProcessing || isShipped || isCompleted ? "In transit" : "Pending"}
                  </p>
                </div>
              </div>

              {/* Step 3: In Transit */}
              <div className="flex flex-row md:flex-col items-center gap-4 md:gap-3 w-full md:w-1/4 relative">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 border transition-all duration-300",
                  isShipped || isCompleted
                    ? "bg-secondary text-on-secondary shadow-[0_0_15px_rgba(255,202,69,0.3)] border-white/20"
                    : "bg-muted text-muted-foreground border-white/5"
                )}>
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-left md:text-center">
                  <h4 className={cn(
                    "text-xs font-bold uppercase tracking-wider font-mono",
                    isShipped || isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}>In Transit</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {isShipped || isCompleted ? "Carrier: UPS" : "Pending"}
                  </p>
                </div>
              </div>

              {/* Step 4: Delivered */}
              <div className="flex flex-row md:flex-col items-center gap-4 md:gap-3 w-full md:w-1/4 relative">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 border transition-all duration-300",
                  isCompleted
                    ? "bg-secondary text-on-secondary shadow-[0_0_15px_rgba(255,202,69,0.3)] border-white/20"
                    : "bg-muted text-muted-foreground border-white/5"
                )}>
                  <Home className="w-5 h-5" />
                </div>
                <div className="text-left md:text-center">
                  <h4 className={cn(
                    "text-xs font-bold uppercase tracking-wider font-mono",
                    isCompleted ? "text-secondary font-bold" : "text-muted-foreground"
                  )}>Delivered</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {isCompleted ? "Completed" : "Pending"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items List in this Order */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-primary font-mono">Items in this Order</h3>
        <div className="flex flex-col gap-4">
          {order.items.map((item: any) => (
            <div 
              key={item.id} 
              className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-6 hover:bg-white/5 transition-all duration-300 border border-white/10 group relative"
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-muted/30 dark:bg-white/[0.02] relative">
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  fill
                  sizes="80px"
                  className="object-cover transition-transform group-hover:scale-105 duration-500"
                />
              </div>
              <div className="flex-grow">
                <h4 className="text-base font-bold font-outfit text-foreground group-hover:text-primary transition-colors duration-300">
                  {item.product.name}
                </h4>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1 font-mono">
                  Qty: {item.quantity} × {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.price)}
                </p>
              </div>
              <div className="text-right sm:ml-auto">
                <div className="text-lg font-bold font-outfit text-primary">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.price * item.quantity)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Cost summary */}
      <div className="border-t border-white/10 pt-6 flex flex-col items-end">
        <div className="w-full max-w-xs space-y-3 font-mono text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="text-foreground">{formattedSubtotal}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span className="text-foreground">$0.00</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax (8.5%)</span>
            <span className="text-foreground">{formattedTax}</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between text-foreground text-sm font-bold">
            <span>Total</span>
            <span className="text-primary text-base font-outfit">{formattedTotal}</span>
          </div>
        </div>
      </div>

      {/* Download invoice action */}
      <div className="flex justify-end pt-4">
        <Button variant="link" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 p-0 h-auto font-mono uppercase tracking-wider">
          Download Invoice <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
