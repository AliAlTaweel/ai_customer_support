import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Package, Clock, CheckCircle, Truck, ExternalLink, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OrderId } from "@/components/orders/order-id";

export default async function OrdersPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Please sign in to view your orders.</h1>
      </div>
    );
  }

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
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold font-outfit tracking-tight">
            My Orders
          </h1>
          <p className="text-muted-foreground">
            Manage and track your luxury collection purchases.
          </p>
        </div>
        <div className="bg-secondary/50 rounded-2xl px-6 py-3 border border-primary/5">
          <span className="text-sm font-medium text-muted-foreground">Total Orders: </span>
          <span className="text-lg font-bold text-primary">{orders.length}</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-secondary/20 backdrop-blur-md rounded-[2.5rem] border border-primary/10 p-20 text-center flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-outfit">No orders yet</h2>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              You haven't made any purchases yet. Explore our luxury catalog to start your collection.
            </p>
          </div>
          <Link href="/shop">
            <button className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all">
              Go to Shop
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
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

  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(order.total);

  const statusConfig = {
    PENDING: { icon: Clock, color: "bg-yellow-500/10 text-yellow-500", label: "Pending" },
    PROCESSING: { icon: CheckCircle, color: "bg-blue-500/10 text-blue-500", label: "Processing" },
    COMPLETED: { icon: CheckCircle, color: "bg-green-500/10 text-green-500", label: "Delivered" },
    CANCELLED: { icon: ExternalLink, color: "bg-red-500/10 text-red-500", label: "Cancelled" },
  };

  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;

  return (
    <div className="group bg-secondary/20 backdrop-blur-md rounded-[2rem] border border-primary/5 hover:border-primary/20 transition-all duration-500 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5">
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-secondary/20 border-b border-primary/5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Order ID</span>
            <div className="relative">
              <OrderId id={order.id} />
            </div>
          </div>
          <div className="space-y-1 border-l border-primary/5 pl-6">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Placed on</span>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary/60" />
              {formattedDate}
            </p>
          </div>
          <div className="space-y-1 border-l border-primary/5 pl-6">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Amount</span>
            <p className="text-sm font-bold text-primary">{formattedTotal}</p>
          </div>
        </div>
        
        <Badge className={cn("rounded-full px-4 py-1.5 border-none font-semibold flex items-center gap-2", status.color)}>
          <status.icon className="w-3.5 h-3.5" />
          {status.label}
        </Badge>
      </div>

      <div className="p-6 md:p-8">
        <div className="grid gap-6">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 group/item">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-primary/5 bg-secondary">
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  fill
                  sizes="64px"
                  className="object-cover transition-transform group-hover/item:scale-110 duration-500"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm line-clamp-1 group-hover/item:text-primary transition-colors">
                  {item.product.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quantity: {item.quantity} × {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.price)}
                </p>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.price * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="px-8 py-4 bg-secondary/10 flex justify-end">
        <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
          Download Invoice <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
