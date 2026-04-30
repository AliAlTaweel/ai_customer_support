"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getAllOrders, 
  updateOrderStatus, 
  deleteOrder, 
  isAdmin, 
  adminLogout,
  getAllComplaints,
  updateComplaintStatus,
  deleteComplaint
} from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Filter,
  MessageSquare,
  AlertCircle,
  Flag,
  Inbox,
  CheckCircle,
  Clock3
} from "lucide-react";
import { cn } from "@/lib/utils";

type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "DELIVERED";

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("orders");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const authorized = await isAdmin();
      if (!authorized) {
        router.push("/");
      } else {
        await Promise.all([fetchOrders(), fetchComplaints()]);
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

  async function fetchComplaints() {
    const result = await getAllComplaints();
    if (result.success) {
      setComplaints(result.complaints || []);
      setError(null);
    } else {
      setError(result.error || "Failed to load messages");
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchOrders(), fetchComplaints()]);
    setIsRefreshing(false);
  };

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

  const handleComplaintStatusUpdate = async (complaintId: string, newStatus: string) => {
    setUpdating(complaintId);
    const result = await updateComplaintStatus(complaintId, newStatus);
    if (result.success) {
      await fetchComplaints();
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  const handleComplaintDelete = async (complaintId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    setUpdating(complaintId);
    const result = await deleteComplaint(complaintId);
    if (result.success) {
      await fetchComplaints();
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  const handleLogout = async () => {
    await adminLogout();
    router.push("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "DELIVERED":
      case "RESOLVED":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "PROCESSING":
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "CANCELLED":
      case "CLOSED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "PENDING":
      case "OPEN":
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "HIGH":
        return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "MEDIUM":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "LOW":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      default:
        return "text-muted-foreground bg-white/5 border-white/10";
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
          <h1 className="text-4xl font-bold font-outfit tracking-tight mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className="border-primary/20 text-primary">Luxe Control Center</Badge>
            System operational and secure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-white/10 bg-white/5 hover:bg-white/10 rounded-2xl h-12 px-6 gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Clock className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="border-primary/5 bg-secondary/10 hover:bg-secondary/20 rounded-2xl h-12 px-6 gap-2 transition-all hover:scale-105 active:scale-95 text-destructive hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="orders" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/10 border border-white/5 p-1 rounded-2xl mb-8 h-14 w-full md:w-auto grid grid-cols-2 md:flex">
            <TabsTrigger value="orders" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black h-full px-8 gap-2">
              <ShoppingBag className="w-4 h-4" />
              Orders
              <Badge variant="secondary" className="ml-2 bg-white/10 text-white border-none">{orders.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="messages" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black h-full px-8 gap-2">
              <MessageSquare className="w-4 h-4" />
              Customer Messages
              <Badge variant="secondary" className="ml-2 bg-white/10 text-white border-none">{complaints.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Orders Content */}
          <TabsContent value="orders" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
            {orders.length === 0 ? (
              <Card className="border-none bg-secondary/10 backdrop-blur-xl p-12 text-center rounded-[2.5rem]">
                <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold font-outfit mb-2">No orders found</h3>
                <p className="text-muted-foreground">When customers place orders, they will appear here.</p>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id} className="border-none bg-secondary/10 backdrop-blur-xl rounded-[2rem] overflow-hidden group transition-all hover:bg-secondary/15 border border-white/5">
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
                          <Badge className={cn("rounded-full px-3 py-1 border font-semibold", getStatusColor(order.status))}>
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
                          <p className="text-2xl font-bold font-outfit text-primary">${(Number(order.total) || 0).toFixed(2)}</p>
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
                              <p className="text-sm font-bold">${((Number(item.quantity) || 0) * (Number(item.price) || 0)).toFixed(2)}</p>
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
          </TabsContent>

          {/* Messages Content */}
          <TabsContent value="messages" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
                <Button variant="link" className="text-destructive underline p-0 ml-auto" onClick={fetchComplaints}>Try again</Button>
              </div>
            )}
            
            {complaints.length === 0 && !error ? (
              <Card className="border-none bg-secondary/10 backdrop-blur-xl p-12 text-center rounded-[2.5rem]">
                <Inbox className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold font-outfit mb-2">No messages yet</h3>
                <p className="text-muted-foreground">When users send complaints or feedback, they will appear here.</p>
              </Card>
            ) : (
              complaints.map((complaint) => (
                <Card key={complaint.id} className="border-none bg-secondary/10 backdrop-blur-xl rounded-[2rem] overflow-hidden group transition-all hover:bg-secondary/15 border border-white/5">
                  <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    complaint.status === "OPEN" ? "bg-yellow-500" : 
                    complaint.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-green-500"
                  )} />
                  
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Left: Metadata */}
                      <div className="md:w-1/4 space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge className={cn("rounded-full px-3 py-1 border font-semibold", getStatusColor(complaint.status))}>
                              {complaint.status}
                            </Badge>
                            <Badge className={cn("rounded-full px-3 py-1 border text-[10px] font-bold", getPriorityColor(complaint.priority))}>
                              {complaint.priority}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <p className="font-semibold text-sm truncate">{complaint.customerName || "Anonymous"}</p>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <Mail className="w-4 h-4 shrink-0" />
                              <span className="truncate">{complaint.customerEmail || "No email"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <Clock3 className="w-4 h-4 shrink-0" />
                              <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Change Status</p>
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => handleComplaintStatusUpdate(complaint.id, "OPEN")}
                              className={cn("p-2 rounded-lg border border-white/5 transition-all hover:bg-yellow-500/10", complaint.status === "OPEN" && "bg-yellow-500/20 border-yellow-500/20")}
                              title="Mark as Open"
                            >
                              <Clock className="w-4 h-4 text-yellow-500" />
                            </button>
                            <button 
                              onClick={() => handleComplaintStatusUpdate(complaint.id, "IN_PROGRESS")}
                              className={cn("p-2 rounded-lg border border-white/5 transition-all hover:bg-blue-500/10", complaint.status === "IN_PROGRESS" && "bg-blue-500/20 border-blue-500/20")}
                              title="Mark as In Progress"
                            >
                              <Loader2 className="w-4 h-4 text-blue-500" />
                            </button>
                            <button 
                              onClick={() => handleComplaintStatusUpdate(complaint.id, "RESOLVED")}
                              className={cn("p-2 rounded-lg border border-white/5 transition-all hover:bg-green-500/10", complaint.status === "RESOLVED" && "bg-green-500/20 border-green-500/20")}
                              title="Mark as Resolved"
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </button>
                            <button 
                              onClick={() => handleComplaintDelete(complaint.id)}
                              className="p-2 rounded-lg border border-white/5 transition-all hover:bg-destructive/10"
                              title="Delete Message"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Message Content */}
                      <div className="flex-1 bg-white/[0.03] rounded-3xl p-8 border border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                            <Flag className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</p>
                            <h3 className="text-xl font-bold font-outfit">{complaint.subject}</h3>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Message</p>
                          <div className="bg-black/40 rounded-2xl p-6 text-muted-foreground leading-relaxed italic border border-white/5">
                            "{complaint.message}"
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
