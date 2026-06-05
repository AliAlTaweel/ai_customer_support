"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  getAllOrders, 
  updateOrderStatus, 
  deleteOrder, 
  isAdmin, 
  adminLogout,
  getAllComplaints,
  updateComplaintStatus,
  deleteComplaint,
  updateComplaintNotes,
  assignComplaintAgent,
  getComplaintTranscript
} from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  Clock3,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { useAuth } from "@clerk/nextjs";

// ── Analytics Types ────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type AnalyticsData = {
  volume: any;
  performance: any;
  topics: any;
  complaints: any;
  business: any;
  loading: boolean;
  error: string | null;
};

const CHART_COLORS = ["#a855f7", "#7c3aed", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#3b82f6"
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#eab308", PROCESSING: "#3b82f6", SHIPPED: "#a855f7",
  DELIVERED: "#10b981", COMPLETED: "#10b981", CANCELLED: "#ef4444"
};

type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "DELIVERED";

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("orders");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTrackingInput, setShowTrackingInput] = useState<string | null>(null);
  const [trackingInfo, setTrackingInfo] = useState({ number: "", carrier: "UPS" });

  // Support ticket actions and states
  const [activeTranscript, setActiveTranscript] = useState<any[] | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [selectedComplaintForTranscript, setSelectedComplaintForTranscript] = useState<any | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

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

  const handleStatusUpdate = async (orderId: string, newStatus: string, tn?: string, carrier?: string) => {
    setUpdating(orderId);
    const result = await updateOrderStatus(orderId, newStatus, tn, carrier);
    if (result.success) {
      await fetchOrders();
      setShowTrackingInput(null);
      setTrackingInfo({ number: "", carrier: "UPS" });
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

  const handleViewTranscript = async (complaint: any) => {
    setSelectedComplaintForTranscript(complaint);
    setActiveTranscript(null);
    setTranscriptLoading(true);
    const sessionId = complaint.chatSessionId || complaint.userId || complaint.customerEmail;
    if (sessionId) {
      const result = await getComplaintTranscript(sessionId);
      if (result.success) {
        setActiveTranscript(result.messages || []);
      } else {
        alert(result.error);
      }
    } else {
      setActiveTranscript([]);
    }
    setTranscriptLoading(false);
  };

  const handleSaveNotes = async (complaintId: string) => {
    setUpdating(complaintId);
    const result = await updateComplaintNotes(complaintId, notesText);
    if (result.success) {
      setEditingNotesId(null);
      await fetchComplaints();
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  const handleAssignAgent = async (complaintId: string, agentName: string) => {
    setUpdating(complaintId);
    const result = await assignComplaintAgent(complaintId, agentName);
    if (result.success) {
      await fetchComplaints();
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "DELIVERED":
      case "RESOLVED":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "SHIPPED":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
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
          <TabsList className="bg-secondary/10 border border-white/5 p-1 rounded-2xl mb-8 h-14 w-full md:w-auto grid grid-cols-3 md:flex">
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
            <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black h-full px-8 gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
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
                    order.status === "SHIPPED" ? "bg-purple-500" : 
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
                            disabled={updating === order.id || order.status === "SHIPPED"}
                            onClick={() => setShowTrackingInput(order.id)}
                            className="rounded-xl border-white/5 bg-secondary/20 hover:bg-purple-500/20"
                          >
                            Shipped
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
                        
                        {showTrackingInput === order.id && (
                          <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-primary/20 space-y-3 animate-in slide-in-from-top-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Shipping Details</p>
                            <Input 
                              placeholder="Tracking #"
                              className="w-full bg-secondary/50 border border-white/10 rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                              value={trackingInfo.number}
                              onChange={(e) => setTrackingInfo({...trackingInfo, number: e.target.value})}
                            />
                            <select 
                              className="w-full bg-secondary/50 border border-white/10 rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                              value={trackingInfo.carrier}
                              onChange={(e) => setTrackingInfo({...trackingInfo, carrier: e.target.value})}
                            >
                              <option value="UPS">UPS</option>
                              <option value="FedEx">FedEx</option>
                              <option value="DHL">DHL</option>
                            </select>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                className="flex-1 rounded-lg h-8 text-[10px] font-bold"
                                onClick={() => handleStatusUpdate(order.id, "SHIPPED", trackingInfo.number, trackingInfo.carrier)}
                              >
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="flex-1 rounded-lg h-8 text-[10px] font-bold"
                                onClick={() => setShowTrackingInput(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
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
              <div className="grid grid-cols-1 gap-6">
                {complaints.map((complaint) => (
                  <Card 
                    key={complaint.id} 
                    className="relative border-none bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] overflow-hidden group transition-all duration-300 hover:translate-y-[-4px] hover:scale-[1.005] hover:bg-zinc-900/80 hover:border-purple-500/20 border border-white/5 shadow-2xl"
                  >
                    {/* Priority vertical stripe accent */}
                    <div className={cn(
                      "absolute top-0 left-0 w-1.5 h-full transition-all duration-300",
                      complaint.priority === "URGENT" ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" :
                      complaint.priority === "HIGH" ? "bg-orange-500" :
                      complaint.priority === "MEDIUM" ? "bg-yellow-500" : "bg-blue-500"
                    )} />
                    
                    <CardContent className="p-8">
                      <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left Column: Metadata & Assignment */}
                        <div className="lg:w-1/3 space-y-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <Badge className={cn("rounded-full px-3 py-1 border font-semibold text-xs", getStatusColor(complaint.status))}>
                                {complaint.status}
                              </Badge>
                              <Badge className={cn("rounded-full px-3 py-1 border text-[10px] font-bold tracking-wider uppercase", getPriorityColor(complaint.priority))}>
                                {complaint.priority}
                              </Badge>
                            </div>
                            
                            <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <User className="w-4 h-4 text-primary" />
                                </div>
                                <p className="font-semibold text-sm truncate">{complaint.customerName || "Anonymous"}</p>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4 shrink-0" />
                                <span className="truncate" title={complaint.customerEmail}>{complaint.customerEmail || "No email"}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Clock3 className="w-4 h-4 shrink-0" />
                                <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Dynamic Agent Assignment Section */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assignee</p>
                            <select
                              value={complaint.assignedTo || ""}
                              disabled={updating === complaint.id}
                              onChange={(e) => handleAssignAgent(complaint.id, e.target.value)}
                              className="w-full bg-black/40 border border-white/5 rounded-xl h-10 px-3 text-xs focus:ring-1 focus:ring-primary outline-none transition-colors hover:border-white/10"
                            >
                              <option value="">Unassigned</option>
                              <option value="Agent Sarah">Agent Sarah</option>
                              <option value="Agent John">Agent John</option>
                              <option value="Agent Alex">Agent Alex</option>
                            </select>
                          </div>

                          {/* Quick Status Control Actions */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Change Status</p>
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                variant="outline"
                                size="icon"
                                disabled={updating === complaint.id}
                                onClick={() => handleComplaintStatusUpdate(complaint.id, "OPEN")}
                                className={cn("h-10 w-10 border-white/5 transition-all hover:bg-yellow-500/10 rounded-lg", complaint.status === "OPEN" && "bg-yellow-500/20 border-yellow-500/20")}
                                title="Mark as Open"
                              >
                                <Clock className="w-4 h-4 text-yellow-500" />
                              </Button>
                              <Button 
                                variant="outline"
                                size="icon"
                                disabled={updating === complaint.id}
                                onClick={() => handleComplaintStatusUpdate(complaint.id, "IN_PROGRESS")}
                                className={cn("h-10 w-10 border-white/5 transition-all hover:bg-blue-500/10 rounded-lg", complaint.status === "IN_PROGRESS" && "bg-blue-500/20 border-blue-500/20")}
                                title="Mark as In Progress"
                              >
                                <Loader2 className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button 
                                variant="outline"
                                size="icon"
                                disabled={updating === complaint.id}
                                onClick={() => handleComplaintStatusUpdate(complaint.id, "RESOLVED")}
                                className={cn("h-10 w-10 border-white/5 transition-all hover:bg-green-500/10 rounded-lg", complaint.status === "RESOLVED" && "bg-green-500/20 border-green-500/20")}
                                title="Mark as Resolved"
                              >
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button 
                                variant="outline"
                                size="icon"
                                disabled={updating === complaint.id}
                                onClick={() => handleComplaintDelete(complaint.id)}
                                className="h-10 w-10 border-white/5 transition-all hover:bg-destructive/10 rounded-lg"
                                title="Delete Ticket"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
  
                        {/* Right Column: Ticket Content & Notes */}
                        <div className="flex-1 space-y-6">
                          {/* Subject & Tags */}
                          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                                  <Flag className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subject</p>
                                  <h3 className="text-lg font-bold font-outfit">{complaint.subject}</h3>
                                </div>
                              </div>
                              
                              {/* Transcript Trigger */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewTranscript(complaint)}
                                className="rounded-xl border-white/5 bg-secondary/20 hover:bg-primary hover:text-black gap-2 h-9 px-4 shrink-0 transition-all"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                View Transcript
                              </Button>
                            </div>

                            <div className="space-y-4">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Message</p>
                              <div className="bg-black/30 rounded-2xl p-5 text-muted-foreground text-sm leading-relaxed border border-white/5 italic">
                                "{complaint.message}"
                              </div>
                            </div>

                            {/* Tags display */}
                            {complaint.tags && complaint.tags.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2 items-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Tags:</span>
                                {complaint.tags.map((tag: string, i: number) => (
                                  <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[10px] rounded-lg px-2.5 py-0.5 font-medium">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Editable Agent Internal Notes */}
                          <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-3xl p-6 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agent Action Notes (Internal Only)</p>
                              {editingNotesId !== complaint.id ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingNotesId(complaint.id);
                                    setNotesText(complaint.internalNotes || "");
                                  }}
                                  className="text-primary hover:text-primary/80 hover:bg-primary/5 h-8 rounded-lg px-3 text-xs"
                                >
                                  {complaint.internalNotes ? "Edit Notes" : "+ Add Notes"}
                                </Button>
                              ) : (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSaveNotes(complaint.id)}
                                    className="text-green-500 hover:text-green-400 hover:bg-green-500/5 h-8 rounded-lg px-3 text-xs font-bold"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingNotesId(null)}
                                    className="text-muted-foreground hover:bg-white/5 h-8 rounded-lg px-3 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>

                            {editingNotesId === complaint.id ? (
                              <textarea
                                value={notesText}
                                onChange={(e) => setNotesText(e.target.value)}
                                placeholder="Describe investigation notes, internal updates, or actions taken..."
                                className="w-full min-h-[80px] bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
                              />
                            ) : (
                              <div className="text-sm text-muted-foreground italic leading-relaxed min-h-[30px] flex items-center">
                                {complaint.internalNotes ? (
                                  <span>"{complaint.internalNotes}"</span>
                                ) : (
                                  <span className="text-muted-foreground/30 font-light">No internal notes logged. Click edit to document steps.</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Analytics Tab ──────────────────────────────────────────── */}
          <TabsContent value="analytics" className="outline-none">
            <AnalyticsPanel />
          </TabsContent>

        </Tabs>
      </div>

      {/* ── Slide-over Chat Transcript Panel ─────────────────────────── */}
      {selectedComplaintForTranscript && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={() => setSelectedComplaintForTranscript(null)} />
          
          <div className="relative w-full max-w-lg bg-zinc-950 border-l border-white/10 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="space-y-1 text-left">
                <Badge variant="outline" className="border-primary/20 text-primary text-[10px] uppercase font-bold">Conversation Context</Badge>
                <h3 className="font-outfit font-bold text-lg text-white">
                  Chat Transcript
                </h3>
                <p className="text-xs text-muted-foreground truncate max-w-xs">{selectedComplaintForTranscript.customerEmail || selectedComplaintForTranscript.customerName || "Customer"}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedComplaintForTranscript(null)}
                className="rounded-full text-muted-foreground hover:text-white hover:bg-white/5 h-10 w-10 flex items-center justify-center"
              >
                <XCircle className="w-6 h-6" />
              </Button>
            </div>

            {/* Transcript Messages Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-950/40 flex flex-col">
              {transcriptLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 my-auto">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-muted-foreground">Retrieving chat messages from SQLite/RDS...</p>
                </div>
              ) : activeTranscript && activeTranscript.length > 0 ? (
                activeTranscript.map((msg, index) => {
                  const isUser = msg.role.toLowerCase() === "user";
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "flex flex-col max-w-[85%] rounded-2xl p-4 border text-sm leading-relaxed shadow-lg text-left",
                        isUser 
                          ? "ml-auto bg-primary/10 border-primary/20 text-primary rounded-tr-none" 
                          : "bg-white/[0.02] border-white/5 text-muted-foreground rounded-tl-none"
                      )}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
                        {isUser ? "User" : "Assistant"}
                      </span>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center my-auto">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/10 mx-auto" />
                  <h4 className="font-semibold text-sm">No Transcript Available</h4>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    This ticket was generated directly or does not have an associated chat session record.
                  </p>
                </div>
              )}
            </div>
            
            {/* Action Footer */}
            <div className="p-6 border-t border-white/5 bg-zinc-950">
              <Button 
                className="w-full rounded-xl"
                onClick={() => setSelectedComplaintForTranscript(null)}
              >
                Close Transcript
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Analytics Panel — fully isolated component, fetches its own data
// ═══════════════════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <Card className="border-none bg-secondary/10 backdrop-blur-xl rounded-[1.5rem] border border-white/5">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", "bg-primary/10")}>
          <Icon className={cn("w-6 h-6", color)} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold font-outfit">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("border-none bg-secondary/10 backdrop-blur-xl rounded-[1.5rem] border border-white/5", className)}>
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">{children}</CardContent>
    </Card>
  );
}

function AnalyticsPanel() {
  const { getToken } = useAuth();
  const [data, setData] = useState<AnalyticsData>({
    volume: null, performance: null, topics: null,
    complaints: null, business: null, loading: true, error: null,
  });

  const fetchAll = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const [vol, perf, top, comp, biz] = await Promise.all([
        fetch(`${API_BASE}/analytics/conversation-volume`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/analytics/performance`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/analytics/topics`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/analytics/complaints`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/analytics/business`, { headers }).then(r => r.json()),
      ]);
      setData({ volume: vol, performance: perf, topics: top, complaints: comp, business: biz, loading: false, error: null });
    } catch (e) {
      setData(prev => ({ ...prev, loading: false, error: "Failed to load analytics. Ensure the backend is running." }));
    }
  }, [getToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading analytics from RDS...</p>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">{data.error}</p>
          <Button variant="outline" onClick={fetchAll} className="gap-2 rounded-xl">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const vol = data.volume || {};
  const perf = data.performance || {};
  const top = data.topics || {};
  const comp = data.complaints || {};
  const biz = data.business || {};

  const volTotals = vol.totals || {};
  const bizTotals = biz.totals || {};
  const compTotals = comp.totals || {};

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Refresh button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchAll}
          className="border-white/10 bg-white/5 hover:bg-white/10 rounded-2xl h-10 px-5 gap-2 text-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </Button>
      </div>

      {/* ── Stat Cards Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Total Messages" value={volTotals.total_messages?.toLocaleString() ?? "—"} sub={`${volTotals.unique_users ?? 0} unique users`} />
        <StatCard icon={Users} label="User Messages" value={volTotals.user_messages?.toLocaleString() ?? "—"} sub={`${volTotals.assistant_messages ?? 0} AI responses`} color="text-purple-400" />
        <StatCard icon={ShoppingBag} label="Total Orders" value={bizTotals.total_orders?.toLocaleString() ?? "—"} sub={`Avg $${bizTotals.avg_order_value?.toFixed(2) ?? "0.00"} / order`} color="text-emerald-400" />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${bizTotals.total_revenue?.toFixed(2) ?? "0.00"}`} sub={`${compTotals.open ?? 0} open complaints`} color="text-amber-400" />
      </div>

      {/* ── Row 1: Conversation Volume ─────────────────────────────── */}
      <SectionCard title="Conversation Volume — Last 30 Days">
        {(vol.volume_by_day || []).length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vol.volume_by_day || []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                labelStyle={{ color: "#a855f7" }}
              />
              <Bar dataKey="user" name="User" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="assistant" name="AI" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm py-8 text-center">No message data in the last 30 days.</p>
        )}
      </SectionCard>

      {/* ── Row 2: AI Performance ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Avg Latency by Pathway (seconds)">
          {(perf.pathways || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perf.pathways || []} layout="vertical" margin={{ top: 4, right: 16, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} />
                <YAxis type="category" dataKey="pathway" tick={{ fill: "#d1d5db", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                  formatter={(v: any) => [`${v}s`, "Avg latency"] as any}
                />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                  {(perf.pathways || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">No telemetry data yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Pathway Distribution">
          {(perf.pathways || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={perf.pathways || []} dataKey="count" nameKey="pathway"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  paddingAngle={3} label={({ pathway, pct }: any) => `${pathway} ${pct}%`}
                  labelLine={false}
                >
                  {(perf.pathways || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                  formatter={(v: any, name: any) => [v, name] as any}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">No pathway data yet.</p>
          )}
        </SectionCard>
      </div>

      {/* ── Row 3: Topic Breakdown ─────────────────────────────────── */}
      <SectionCard title="Top Keywords from Customer Messages (Last 30 Days)">
        {(top.keywords || []).length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top.keywords || []} layout="vertical" margin={{ top: 4, right: 16, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis type="category" dataKey="word" tick={{ fill: "#d1d5db", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                formatter={(v: any) => [v, "mentions"] as any}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#a855f7">
                {(top.keywords || []).map((_: any, i: number) => (
                  <Cell key={i} fill={`hsl(${270 + i * 8}, 70%, ${60 - i * 2}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm py-8 text-center">No keyword data available.</p>
        )}
        {top.total_messages_analyzed > 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-right">
            Analyzed {top.total_messages_analyzed} messages · Stop words excluded · No PII
          </p>
        )}
      </SectionCard>

      {/* ── Row 4: Complaints + Business ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <SectionCard title="Complaint & Escalation Tracker">
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total", value: compTotals.total ?? 0, color: "text-white" },
              { label: "Open", value: compTotals.open ?? 0, color: "text-yellow-400" },
              { label: "Resolved", value: compTotals.resolved ?? 0, color: "text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                <p className={cn("text-2xl font-bold font-outfit", color)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1 mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Resolution Rate</span>
              <span className="text-emerald-400 font-bold">{compTotals.resolution_rate_pct ?? 0}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${compTotals.resolution_rate_pct ?? 0}%` }} />
            </div>
          </div>
          {(comp.by_priority || []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Open by Priority</p>
              {(comp.by_priority || []).map((row: any) => (
                <div key={row.priority} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[row.priority] || "#fff" }} />
                    <span className="text-sm">{row.priority}</span>
                  </div>
                  <Badge className="rounded-full" style={{ background: `${PRIORITY_COLORS[row.priority]}22`, color: PRIORITY_COLORS[row.priority], border: `1px solid ${PRIORITY_COLORS[row.priority]}44` }}>
                    {row.count}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {compTotals.avg_resolution_hours > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Avg resolution: <span className="text-white font-semibold">{compTotals.avg_resolution_hours}h</span>
            </p>
          )}
        </SectionCard>

        <SectionCard title="Business Metrics">
          <div className="space-y-4">
            {(biz.by_status || []).length > 0 && (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Order Status</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={biz.by_status || []} dataKey="count" nameKey="status"
                      cx="50%" cy="50%" outerRadius={60} innerRadius={30} paddingAngle={3}>
                      {(biz.by_status || []).map((row: any, i: number) => (
                        <Cell key={i} fill={STATUS_COLORS[row.status] || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                    />
                    <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
            {(biz.top_products || []).length > 0 && (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">Top Products by Units Sold</p>
                <div className="space-y-2">
                  {(biz.top_products || []).map((p: any, i: number) => (
                    <div key={p.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                        <span className="text-sm truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-xs text-muted-foreground">{p.units_sold} sold</span>
                        <span className="text-sm font-bold text-emerald-400">${p.revenue.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
