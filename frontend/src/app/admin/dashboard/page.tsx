"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllOrders, updateOrderStatus, deleteOrder, isAdmin, adminLogout } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  LogOut, 
  ChevronRight, 
  Package, 
  User, 
  Mail, 
  MapPin, 
  CreditCard as PaymentIcon,
  Loader2,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "DELIVERED";

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const authorized = await isAdmin();
      if (!authorized) {
        router.push("/admin/login");
      } else {
        fetchOrders();
      }
    }
    checkAuth();
  }, [router]);

  async function fetchOrders() {
    setLoading(true);
    const result = await getAllOrders();
    if (result.success) {
      setOrders(result.orders || []);
    }
    setLoading(false);
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      await fetchOrders();
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
    setUpdating(orderId);
    const result = await deleteOrder(orderId);
    if (result.success) {
      await fetchOrders();
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  const handleLogout = async () => {
    await adminLogout();
    router.push("/admin/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "DELIVERED":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "PROCESSING":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "CANCELLED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "PENDING":
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-outfit tracking-tight mb-2">Order Management</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className="border-primary/20 text-primary">Admin Control Center</Badge>
            Showing {orders.length} total orders
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="border-primary/5 bg-secondary/10 hover:bg-secondary/20 rounded-2xl h-12 px-6 gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto space-y-6">
        {orders.length === 0 ? (
          <Card className="border-none bg-secondary/10 backdrop-blur-xl p-12 text-center rounded-[2.5rem]">
            <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold font-outfit mb-2">No orders found</h3>
            <p className="text-muted-foreground">When customers place orders, they will appear here.</p>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="border-none bg-secondary/10 backdrop-blur-xl rounded-[2rem] overflow-hidden group transition-all hover:bg-secondary/15">
              <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                order.status === "DELIVERED" ? "bg-green-500" : 
                order.status === "CANCELLED" ? "bg-destructive" : "bg-primary"
              )} />
              
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Customer Info Section */}
                  <div className="p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-white/5 space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Order ID</p>
                        <p className="font-mono text-sm text-primary">{order.id.split('-')[0]}...</p>
                      </div>
                      <Badge className={cn("rounded-full px-3 py-1 border", getStatusColor(order.status))}>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <p className="font-semibold">{order.customerName || "Anonymous Customer"}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span className="truncate">{order.customerEmail || "No email provided"}</span>
                      </div>
                      <div className="flex items-start gap-3 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{order.shippingAddress}, {order.shippingCity}, {order.shippingCountry}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Section */}
                  <div className="p-8 flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Items Ordered</p>
                      <p className="text-xl font-bold font-outfit text-primary">${order.total.toFixed(2)}</p>
                    </div>
                    
                    <div className="space-y-3">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 transition-colors hover:bg-white/10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center border border-white/10">
                              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{item.product.name}</p>
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ${item.price}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold">${(item.quantity * item.price).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="p-8 md:w-64 bg-white/[0.02] flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-white/5">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 text-center">Update Status</p>
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={updating === order.id || order.status === "PENDING"}
                        onClick={() => handleStatusUpdate(order.id, "PENDING")}
                        className="rounded-xl border-white/5 bg-secondary/20 hover:bg-yellow-500/20"
                      >
                        Pending
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={updating === order.id || order.status === "DELIVERED"}
                        onClick={() => handleStatusUpdate(order.id, "DELIVERED")}
                        className="rounded-xl border-white/5 bg-secondary/20 hover:bg-green-500/20"
                      >
                        Delivered
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={updating === order.id || order.status === "CANCELLED"}
                        onClick={() => handleStatusUpdate(order.id, "CANCELLED")}
                        className="rounded-xl border-white/5 bg-secondary/20 hover:bg-destructive/20"
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={updating === order.id}
                        onClick={() => handleDelete(order.id)}
                        className="rounded-xl border-white/5 bg-destructive/10 hover:bg-destructive/30 text-destructive border-destructive/20"
                      >
                        {updating === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
