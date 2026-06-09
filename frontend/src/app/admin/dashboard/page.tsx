"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  getComplaintTranscript,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
} from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  RefreshCw,
  Plus,
  Edit,
  Search,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  HelpCircle,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { useAuth } from "@clerk/nextjs";
import type { Order, Complaint, FAQ, Product, OrderItem, ChatMessage } from "@/generated/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type OrderWithItems = Order & {
  items: Array<OrderItem & { product: Product }>;
};

interface VolumeData {
  totals?: {
    total_messages?: number;
    unique_users?: number;
    assistant_messages?: number;
    user_messages?: number;
  };
  volume_by_day?: Array<{
    date: string;
    user: number;
    assistant: number;
  }>;
}

interface PerformanceData {
  pathways?: Array<{
    pathway: string;
    count: number;
    pct: number;
    avg: number;
  }>;
}

interface TopicsData {
  keywords?: Array<{
    word: string;
    count: number;
  }>;
}

interface BusinessData {
  totals?: {
    total_orders?: number;
    avg_order_value?: number;
    total_revenue?: number;
  };
  by_status?: Array<{
    status: string;
    count: number;
  }>;
  top_products?: Array<{
    name: string;
    units_sold: number;
    revenue: number;
  }>;
}

interface ComplaintsData {
  totals?: {
    open: number;
  };
}

type AnalyticsData = {
  volume: VolumeData | null;
  performance: PerformanceData | null;
  topics: TopicsData | null;
  complaints: ComplaintsData | null;
  business: BusinessData | null;
  loading: boolean;
  error: string | null;
};

const CHART_COLORS = ["#a855f7", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#eab308",
  PROCESSING: "#3b82f6",
  SHIPPED: "#a855f7",
  DELIVERED: "#10b981",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected IDs for Master-Detail Splitting
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedFaqId, setSelectedFaqId] = useState<string | null>(null);

  // Derived state selections
  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  const selectedComplaint = useMemo(() => {
    return complaints.find((c) => c.id === selectedComplaintId) || null;
  }, [complaints, selectedComplaintId]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  const selectedFaq = useMemo(() => {
    return faqs.find((f) => f.id === selectedFaqId) || null;
  }, [faqs, selectedFaqId]);

  // Form states for creating new items
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingFaq, setIsAddingFaq] = useState(false);

  // Support ticket actions and states
  const [activeTranscript, setActiveTranscript] = useState<ChatMessage[] | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  // Search/Filters states
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [showTrackingInput, setShowTrackingInput] = useState<string | null>(null);
  const [trackingInfo, setTrackingInfo] = useState({ number: "", carrier: "UPS" });

  const [complaintSearch, setComplaintSearch] = useState("");
  const [complaintStatusFilter, setComplaintStatusFilter] = useState("ALL");
  const [complaintPriorityFilter, setComplaintPriorityFilter] = useState("ALL");

  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("ALL");
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "electronics",
    stock: "",
    imageUrl: "",
    details: "",
  });

  const [faqSearch, setFaqSearch] = useState("");
  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
  });

  const fetchOrders = useCallback(async () => {
    const result = await getAllOrders();
    if (result.success) setOrders((result.orders as OrderWithItems[]) || []);
  }, []);

  const fetchComplaints = useCallback(async () => {
    const result = await getAllComplaints();
    if (result.success) {
      setComplaints((result.complaints as Complaint[]) || []);
      setError(null);
    } else {
      setError(result.error || "Failed to load complaints");
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    const result = await getAllProductsAdmin();
    if (result.success) setProducts((result.products as Product[]) || []);
  }, []);

  const fetchFaqs = useCallback(async () => {
    const result = await getAllFAQs();
    if (result.success) setFaqs((result.faqs as FAQ[]) || []);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setLoading(true);
    await Promise.all([fetchOrders(), fetchComplaints(), fetchProducts(), fetchFaqs()]);
    setLoading(false);
    setIsRefreshing(false);
  }, [fetchOrders, fetchComplaints, fetchProducts, fetchFaqs]);

  useEffect(() => {
    async function checkAuth() {
      const authorized = await isAdmin();
      if (!authorized) {
        router.push("/");
      } else {
        await handleRefresh();
      }
    }
    checkAuth();
  }, [router, handleRefresh]);

  // Keep product edit form synced on selected product changes
  useEffect(() => {
    if (selectedProduct) {
      const timer = setTimeout(() => {
        setProductForm({
          name: selectedProduct.name,
          description: selectedProduct.description,
          price: String(selectedProduct.price),
          category: selectedProduct.category,
          stock: String(selectedProduct.stock),
          imageUrl: selectedProduct.imageUrl,
          details: selectedProduct.details || "",
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedProduct]);

  // Keep FAQ edit form synced on selected FAQ changes
  useEffect(() => {
    if (selectedFaq) {
      const timer = setTimeout(() => {
        setFaqForm({
          question: selectedFaq.question,
          answer: selectedFaq.answer,
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedFaq]);

  // ── Orders CRUD ──
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

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
    setUpdating(orderId);
    const result = await deleteOrder(orderId);
    if (result.success) {
      await fetchOrders();
      setSelectedOrderId(null);
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  // ── Tickets CRUD ──
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
    if (!confirm("Are you sure you want to delete this complaint ticket?")) return;
    setUpdating(complaintId);
    const result = await deleteComplaint(complaintId);
    if (result.success) {
      await fetchComplaints();
      setSelectedComplaintId(null);
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  const handleViewTranscript = async (complaint: Complaint) => {
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

  // ── Products CRUD ──
  const handleOpenAddProduct = () => {
    setSelectedProductId(null);
    setIsAddingProduct(true);
    setProductForm({
      name: "",
      description: "",
      price: "",
      category: "electronics",
      stock: "",
      imageUrl: "",
      details: "",
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !productForm.category) {
      alert("Please enter a name, price, and category.");
      return;
    }

    const payload = {
      name: productForm.name,
      description: productForm.description,
      price: parseFloat(productForm.price) || 0,
      category: productForm.category,
      stock: parseInt(productForm.stock) || 0,
      imageUrl: productForm.imageUrl || "/images/placeholder.png",
      details: productForm.details,
    };

    let result;
    if (selectedProduct) {
      result = await updateProduct(selectedProduct.id, payload);
    } else {
      result = await createProduct(payload);
    }

    if (result.success) {
      setIsAddingProduct(false);
      await fetchProducts();
      if (!selectedProduct && result.product) {
        setSelectedProductId((result.product as Product).id);
      }
    } else {
      alert(result.error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const result = await deleteProduct(id);
    if (result.success) {
      setSelectedProductId(null);
      await fetchProducts();
    } else {
      alert(result.error);
    }
  };

  // ── FAQs CRUD ──
  const handleOpenAddFaq = () => {
    setSelectedFaqId(null);
    setIsAddingFaq(true);
    setFaqForm({ question: "", answer: "" });
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqForm.question || !faqForm.answer) {
      alert("Please fill in both the question and the answer.");
      return;
    }

    let result;
    if (selectedFaq) {
      result = await updateFAQ(selectedFaq.id, faqForm.question, faqForm.answer);
    } else {
      result = await createFAQ(faqForm.question, faqForm.answer);
    }

    if (result.success) {
      setIsAddingFaq(false);
      await fetchFaqs();
      if (!selectedFaq && result.faq) {
        setSelectedFaqId((result.faq as FAQ).id);
      }
    } else {
      alert(result.error);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    const result = await deleteFAQ(id);
    if (result.success) {
      setSelectedFaqId(null);
      await fetchFaqs();
    } else {
      alert(result.error);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    router.push("/");
  };

  // Colors helpers
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
        return "bg-red-500/10 text-red-500 border-red-500/20";
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

  // Memoized Filtered Lists
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
        (o.customerName || "").toLowerCase().includes(orderSearch.toLowerCase()) ||
        (o.customerEmail || "").toLowerCase().includes(orderSearch.toLowerCase());
      const matchesStatus = orderStatusFilter === "ALL" || o.status === orderStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesSearch =
        c.subject.toLowerCase().includes(complaintSearch.toLowerCase()) ||
        (c.customerName || "").toLowerCase().includes(complaintSearch.toLowerCase()) ||
        (c.customerEmail || "").toLowerCase().includes(complaintSearch.toLowerCase()) ||
        (c.message || "").toLowerCase().includes(complaintSearch.toLowerCase());
      const matchesStatus = complaintStatusFilter === "ALL" || c.status === complaintStatusFilter;
      const matchesPriority = complaintPriorityFilter === "ALL" || c.priority === complaintPriorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [complaints, complaintSearch, complaintStatusFilter, complaintPriorityFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = productCategoryFilter === "ALL" || p.category === productCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearch, productCategoryFilter]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
        f.answer.toLowerCase().includes(faqSearch.toLowerCase())
    );
  }, [faqs, faqSearch]);

  const productCategories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set);
  }, [products]);

  // Loading spinner
  if (loading && !isRefreshing) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-outfit">Loading Luxe Admin Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-neutral-100 flex flex-col relative admin-dashboard-container">
      <style dangerouslySetInnerHTML={{ __html: `
        html:not(.dark) .admin-dashboard-container {
          background-color: #faf9fc !important;
          color: #443199 !important;
        }
        html:not(.dark) .admin-header {
          background-color: #ffffff !important;
          border-color: #ebdff5 !important;
          box-shadow: 0 4px 20px -2px rgba(121, 44, 162, 0.05) !important;
        }
        html:not(.dark) .admin-logo-text {
          color: #443199 !important;
        }
        html:not(.dark) [class*="bg-neutral-900/60"] {
          background-color: #f6f0fc !important;
          border-color: #ebdff5 !important;
        }
        html:not(.dark) button[class*="text-neutral-400"]:not([class*="bg-violet-600"]) {
          color: #792ca2 !important;
        }
        html:not(.dark) button[class*="text-neutral-400"]:not([class*="bg-violet-600"]):hover {
          color: #443199 !important;
          background-color: #f3ebfa !important;
        }
        html:not(.dark) [class*="bg-neutral-900/35"],
        html:not(.dark) [class*="bg-[#09090f]/35"],
        html:not(.dark) [class*="bg-[#09090f]/30"],
        html:not(.dark) [class*="bg-[#0a0a0f]"] {
          background-color: #ffffff !important;
          border-color: #ebdff5 !important;
          box-shadow: 0 4px 18px -4px rgba(121, 44, 162, 0.04) !important;
        }
        html:not(.dark) [class*="border-neutral-800"],
        html:not(.dark) [class*="border-neutral-850"],
        html:not(.dark) [class*="border-neutral-800/80"],
        html:not(.dark) [class*="border-neutral-800/60"],
        html:not(.dark) [class*="border-neutral-800/40"] {
          border-color: #f0e6fa !important;
        }
        html:not(.dark) [class*="border-t border-neutral-800"] {
          border-top-color: #f0e6fa !important;
        }
        html:not(.dark) [class*="bg-[#141424]"] {
          background-color: #faf0fc !important;
          border-color: #c13383 !important;
          box-shadow: 0 4px 12px rgba(193, 51, 131, 0.08) !important;
        }
        html:not(.dark) [class*="bg-[#141424]"] h4,
        html:not(.dark) [class*="bg-[#141424]"] p,
        html:not(.dark) [class*="bg-[#141424]"] span:not([class*="bg-"]) {
          color: #443199 !important;
        }
        html:not(.dark) [class*="bg-neutral-900/35"]:hover,
        html:not(.dark) [class*="bg-[#09090f]/30"] [class*="hover:bg-neutral-900/60"]:hover {
          background-color: #faf5ff !important;
        }
        html:not(.dark) input,
        html:not(.dark) select,
        html:not(.dark) textarea,
        html:not(.dark) [class*="bg-neutral-950"] {
          background-color: #ffffff !important;
          border-color: #dfd5ed !important;
          color: #443199 !important;
        }
        html:not(.dark) input::placeholder,
        html:not(.dark) textarea::placeholder {
          color: #a497b8 !important;
        }
        html:not(.dark) input:focus,
        html:not(.dark) select:focus,
        html:not(.dark) textarea:focus {
          border-color: #792ca2 !important;
          box-shadow: 0 0 0 2px rgba(121, 44, 162, 0.15) !important;
        }
        html:not(.dark) .text-white,
        html:not(.dark) .text-neutral-100 {
          color: #443199 !important;
        }
        html:not(.dark) .text-neutral-200 {
          color: #443199 !important;
        }
        html:not(.dark) .text-neutral-300 {
          color: #792ca2 !important;
        }
        html:not(.dark) .text-neutral-400 {
          color: #792ca2 !important;
        }
        html:not(.dark) .text-neutral-500 {
          color: #a497b8 !important;
        }
        html:not(.dark) button[class*="bg-neutral-900/40"] {
          background-color: #ffffff !important;
          border-color: #dfd5ed !important;
          color: #792ca2 !important;
        }
        html:not(.dark) button[class*="bg-neutral-900/40"]:hover {
          background-color: #faf5ff !important;
          color: #443199 !important;
        }
        html:not(.dark) button[class*="bg-red-500/5"] {
          border-color: #fca5a5 !important;
          background-color: #fef2f2 !important;
          color: #ef4444 !important;
        }
        html:not(.dark) button[class*="bg-red-500/5"]:hover {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;
        }
        html:not(.dark) .recharts-default-tooltip {
          background-color: #ffffff !important;
          border-color: #ebdff5 !important;
          color: #443199 !important;
          box-shadow: 0 4px 12px rgba(121, 44, 162, 0.05) !important;
        }
        html:not(.dark) .admin-scrollarea {
          background-color: #faf5ff !important;
          border-color: #ebdff5 !important;
        }
        html:not(.dark) [class*="bg-violet-600"],
        html:not(.dark) button[class*="bg-violet-600"] {
          background-color: #792ca2 !important;
          color: #ffffff !important;
        }
        html:not(.dark) [class*="bg-violet-600"]:hover,
        html:not(.dark) button[class*="bg-violet-600"]:hover {
          background-color: #632287 !important;
        }
        html:not(.dark) [class*="text-violet-400"] {
          color: #c13383 !important;
        }
        html:not(.dark) [class*="text-violet-300"] {
          color: #792ca2 !important;
        }
        html:not(.dark) [class*="from-violet-600"] {
          background-image: linear-gradient(to top right, #443199, #c13383) !important;
        }
      `}} />
      {/* ── TOP HEADER NAVBAR ── */}
      <header className="w-full bg-[#0a0a0f]/80 backdrop-blur-md border-b border-neutral-800 z-40 sticky top-20 admin-header">
        <div className="max-w-7xl w-full mx-auto px-6 md:px-8 h-14 flex items-center justify-between gap-6">
          {/* Horizontal Top Tabs list */}
          <div className="flex items-center gap-1 bg-neutral-900/40 p-0.5 rounded-lg border border-neutral-800/40 admin-tab-list">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "orders", label: "Orders Desk", icon: ShoppingBag, count: orders.length },
              { id: "tickets", label: "Helpdesk Tickets", icon: MessageSquare, count: complaints.filter(c => c.status !== "RESOLVED").length },
              { id: "products", label: "Products Catalog", icon: Package },
              { id: "faqs", label: "FAQ Knowledge", icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    // Reset master-detail selected options to avoid cross-tab UI leak
                    if (tab.id === "orders" && filteredOrders.length > 0 && !selectedOrder) {
                      setSelectedOrderId(filteredOrders[0].id);
                    }
                    if (tab.id === "tickets" && filteredComplaints.length > 0 && !selectedComplaint) {
                      setSelectedComplaintId(filteredComplaints[0].id);
                      handleViewTranscript(filteredComplaints[0]);
                    }
                    if (tab.id === "products" && filteredProducts.length > 0 && !selectedProduct) {
                      setSelectedProductId(filteredProducts[0].id);
                      setIsAddingProduct(false);
                    }
                    if (tab.id === "faqs" && filteredFaqs.length > 0 && !selectedFaq) {
                      setSelectedFaqId(filteredFaqs[0].id);
                      setIsAddingFaq(false);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.03]"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.2 rounded-full",
                      isActive ? "bg-white/20 text-white" : "bg-neutral-800 text-neutral-400"
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-neutral-800 bg-neutral-900/40 text-neutral-300 hover:bg-neutral-850 h-8 w-8 rounded-lg"
              title="Refresh Data"
            >
              <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-red-500/10 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 h-8 px-3 rounded-lg gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* ── CENTRAL WORKSPACE PANEL ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AnalyticsPanel />
          </div>
        )}

        {/* TAB: ORDERS MASTER-DETAIL */}
        {activeTab === "orders" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
            {/* Left side list of orders */}
            <div className="lg:col-span-1 space-y-4">
              {/* Search & filter */}
              <div className="bg-neutral-900/35 border border-neutral-850 p-4 rounded-2xl space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-[50%] translate-y-[-50%] w-3.5 h-3.5 text-neutral-500" />
                  <Input
                    placeholder="Search invoices..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="pl-9 h-9 rounded-xl bg-neutral-950 border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="h-8 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 px-2 text-[11px] w-full focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Master List items */}
              <ScrollArea className="h-[calc(100vh-270px)] border border-neutral-800 bg-[#09090f]/30 rounded-2xl">
                <div className="p-3 space-y-2">
                  {filteredOrders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={cn(
                          "p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left relative",
                          isSelected
                            ? "bg-[#141424] border-violet-500/40 shadow-lg"
                            : "bg-neutral-900/35 border-neutral-800/80 hover:bg-neutral-900/60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <span className="font-mono text-[10px] text-violet-400">
                            #{order.id.split("-")[0]}
                          </span>
                          <span className="text-[9px] text-neutral-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-white truncate">{order.customerName || "Anonymous"}</h4>
                        <div className="mt-3 flex items-center justify-between border-t border-neutral-800/40 pt-2.5">
                          <span className="text-xs font-semibold text-violet-300">${Number(order.total).toFixed(2)}</span>
                          <Badge className={cn("text-[8px] px-1.5 py-0.2 rounded-full", getStatusColor(order.status))}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <div className="p-8 text-center text-neutral-500 text-xs">No orders match parameters.</div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right side Invoice detail viewer */}
            <div className="lg:col-span-2">
              {selectedOrder ? (
                <Card className="border-neutral-800 bg-[#09090f]/35 rounded-2xl border flex flex-col min-h-[500px]">
                  <CardHeader className="p-6 border-b border-neutral-850 bg-neutral-900/20 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[9px] text-violet-400 font-bold uppercase tracking-widest font-mono">
                          Selected Order Details
                        </span>
                        <CardTitle className="text-base font-bold font-outfit text-white mt-1">
                          Invoice ID #{selectedOrder.id}
                        </CardTitle>
                        <CardDescription className="text-xs text-neutral-400 mt-0.5">
                          Received on {new Date(selectedOrder.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <div className="p-6 space-y-6 text-left flex-1">
                    {/* Status modifier buttons */}
                    <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
                          Current status:
                        </span>
                        <Badge className={cn("text-[9px] rounded-full border px-2.5 py-0.5", getStatusColor(selectedOrder.status))}>
                          {selectedOrder.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((st) => (
                          <Button
                            key={st}
                            variant="outline"
                            size="sm"
                            disabled={updating === selectedOrder.id || selectedOrder.status === st}
                            onClick={() => {
                              if (st === "SHIPPED") {
                                setShowTrackingInput(selectedOrder.id);
                              } else {
                                handleStatusUpdate(selectedOrder.id, st);
                              }
                            }}
                            className={cn(
                              "rounded-lg text-[9px] h-8 font-bold border-neutral-800 bg-neutral-900/60 text-neutral-300",
                              selectedOrder.status === st && "bg-neutral-800 text-white border-neutral-700"
                            )}
                          >
                            {st.toLowerCase()}
                          </Button>
                        ))}
                      </div>

                      {showTrackingInput === selectedOrder.id && (
                        <div className="p-3.5 bg-neutral-900 border border-violet-500/10 rounded-lg space-y-2 animate-in slide-in-from-top-2">
                          <span className="text-[9px] uppercase font-bold text-violet-400 block font-mono">
                            Carrier Details
                          </span>
                          <Input
                            placeholder="Tracking #"
                            className="bg-neutral-950 border-neutral-850 text-xs h-8 rounded-lg"
                            value={trackingInfo.number}
                            onChange={(e) => setTrackingInfo({ ...trackingInfo, number: e.target.value })}
                          />
                          <select
                            className="w-full bg-neutral-950 border border-neutral-850 rounded-lg p-1.5 text-xs text-neutral-300 focus:outline-none"
                            value={trackingInfo.carrier}
                            onChange={(e) => setTrackingInfo({ ...trackingInfo, carrier: e.target.value })}
                          >
                            <option value="UPS">UPS</option>
                            <option value="FedEx">FedEx</option>
                            <option value="DHL">DHL</option>
                          </select>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 rounded-lg h-7 text-[10px] font-semibold bg-violet-600 text-white"
                              onClick={() => handleStatusUpdate(selectedOrder.id, "SHIPPED", trackingInfo.number, trackingInfo.carrier)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 rounded-lg h-7 text-[10px] border border-neutral-800 text-neutral-400"
                              onClick={() => setShowTrackingInput(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Customer info card */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
                          Customer Summary
                        </span>
                        <div className="p-4 bg-neutral-950/40 border border-neutral-800 rounded-xl space-y-2.5">
                          <div className="flex items-center gap-3">
                            <User className="w-3.5 h-3.5 text-neutral-500" />
                            <p className="font-semibold text-xs text-white">{selectedOrder.customerName || "Anonymous"}</p>
                          </div>
                          <div className="flex items-center gap-3 text-neutral-400">
                            <Mail className="w-3.5 h-3.5 text-neutral-500" />
                            <span className="text-xs truncate">{selectedOrder.customerEmail || "No email"}</span>
                          </div>
                          {selectedOrder.shippingAddress && (
                            <div className="flex items-start gap-3 text-neutral-400">
                              <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                              <span className="text-xs leading-relaxed">
                                {selectedOrder.shippingAddress}, {selectedOrder.shippingCity}, {selectedOrder.shippingCountry}
                              </span>
                            </div>
                          )}
                          {selectedOrder.trackingNumber && (
                            <div className="flex items-center gap-2.5 text-violet-400 bg-violet-500/5 p-2 rounded-lg border border-violet-500/10 font-mono text-[9px]">
                              <Package className="w-3 h-3" />
                              <span>{selectedOrder.carrier}: {selectedOrder.trackingNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items details listing */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
                          Purchased Items
                        </span>
                        <div className="space-y-2">
                          {selectedOrder.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/30 border border-neutral-800/60"
                            >
                              <div className="flex items-center gap-3">
                                <ShoppingBag className="w-3.5 h-3.5 text-neutral-500" />
                                <div>
                                  <p className="font-bold text-xs text-white line-clamp-1">{item.product?.name}</p>
                                  <p className="text-[10px] text-neutral-500 mt-0.5 font-medium">
                                    Qty: {item.quantity} × ${item.price.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <p className="font-bold text-xs text-neutral-200">
                                ${(Number(item.quantity) * Number(item.price)).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-neutral-850 bg-neutral-900/20 flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-xs text-neutral-400 font-medium">Invoice Value Total</span>
                      <p className="text-lg font-bold text-violet-400 mt-0.5">${Number(selectedOrder.total).toFixed(2)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updating === selectedOrder.id}
                      onClick={() => handleDeleteOrder(selectedOrder.id)}
                      className="border-red-500/10 bg-red-500/5 hover:bg-red-500/15 text-red-400 rounded-xl px-4"
                    >
                      Delete Invoice Permanent
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="h-full border border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-neutral-500 min-h-[500px]">
                  <Inbox className="w-16 h-16 text-neutral-800 mb-4" />
                  <h3 className="font-bold text-base text-neutral-400">No Invoice Selected</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    Click any order item in the left queue to edit its fulfillment status or delete details.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: HELPDESK TICKETS MASTER-DETAIL */}
        {activeTab === "tickets" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
            {/* Left list of tickets */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-neutral-900/20 border border-neutral-800 p-4 rounded-2xl space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-[50%] translate-y-[-50%] w-3.5 h-3.5 text-neutral-500" />
                  <Input
                    placeholder="Search complaints..."
                    value={complaintSearch}
                    onChange={(e) => setComplaintSearch(e.target.value)}
                    className="pl-9 h-9 rounded-xl bg-neutral-950 border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={complaintStatusFilter}
                    onChange={(e) => setComplaintStatusFilter(e.target.value)}
                    className="h-8 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 px-2 text-[10px] focus:outline-none"
                  >
                    <option value="ALL">All Status</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                  <select
                    value={complaintPriorityFilter}
                    onChange={(e) => setComplaintPriorityFilter(e.target.value)}
                    className="h-8 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 px-2 text-[10px] focus:outline-none"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-270px)] border border-neutral-800 bg-[#09090f]/30 rounded-2xl">
                <div className="p-3 space-y-2">
                  {filteredComplaints.map((c) => {
                    const isSelected = selectedComplaintId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedComplaintId(c.id);
                          handleViewTranscript(c);
                        }}
                        className={cn(
                          "p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left relative",
                          isSelected ? "bg-[#141424] border-violet-500/40 shadow-lg" : "bg-neutral-900/35 border-neutral-800/80 hover:bg-neutral-900/60"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0 left-0 w-1 h-full rounded-l-xl",
                          c.priority === "URGENT" ? "bg-red-500 animate-pulse" :
                          c.priority === "HIGH" ? "bg-orange-500" :
                          c.priority === "MEDIUM" ? "bg-yellow-500" : "bg-blue-500"
                        )} />
                        <div className="flex items-start justify-between gap-3 mb-1.5 pl-1.5">
                          <h4 className="font-semibold text-xs text-white truncate max-w-[130px]">{c.subject}</h4>
                          <span className="text-[9px] text-neutral-500 font-mono shrink-0">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 pl-1.5 line-clamp-2 leading-relaxed">
                          &ldquo;{c.message}&rdquo;
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2 pl-1.5 border-t border-neutral-800/50 pt-2.5">
                          <span className="text-[10px] text-neutral-500 font-medium truncate max-w-[100px]">
                            {c.customerName || "Anonymous"}
                          </span>
                          <div className="flex gap-1.5 shrink-0">
                            <Badge className={cn("text-[8px] px-1.5 py-0 rounded", getStatusColor(c.status))}>
                              {c.status}
                            </Badge>
                            <Badge className={cn("text-[8px] px-1.5 py-0 border rounded font-semibold", getPriorityColor(c.priority))}>
                              {c.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredComplaints.length === 0 && (
                    <div className="p-8 text-center text-neutral-500 text-xs">No support tickets match query.</div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right details of ticket */}
            <div className="lg:col-span-2">
              {selectedComplaint ? (
                <Card className="border-neutral-800 bg-[#09090f]/35 backdrop-blur-xl rounded-2xl border flex flex-col h-full min-h-[500px]">
                  <CardHeader className="p-6 border-b border-neutral-800 bg-neutral-900/20 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[9px] text-violet-400 font-bold uppercase tracking-widest font-mono">
                          Ticket #{selectedComplaint.id.split("-")[0]}
                        </span>
                        <CardTitle className="text-base font-bold font-outfit text-white mt-1">
                          {selectedComplaint.subject}
                        </CardTitle>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Customer: <span className="font-semibold text-neutral-200">{selectedComplaint.customerName}</span> · {selectedComplaint.customerEmail}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <select
                          value={selectedComplaint.assignedTo || ""}
                          onChange={(e) => handleAssignAgent(selectedComplaint.id, e.target.value)}
                          disabled={updating === selectedComplaint.id}
                          className="bg-neutral-950 border border-neutral-800 rounded-xl h-8 px-2 text-[10px] text-neutral-300 focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          <option value="Agent Sarah">Agent Sarah</option>
                          <option value="Agent John">Agent John</option>
                          <option value="Agent Alex">Agent Alex</option>
                        </select>
                        <select
                          value={selectedComplaint.status}
                          onChange={(e) => handleComplaintStatusUpdate(selectedComplaint.id, e.target.value)}
                          disabled={updating === selectedComplaint.id}
                          className="bg-neutral-950 border border-neutral-800 rounded-xl h-8 px-2 text-[10px] text-neutral-300 focus:outline-none"
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={updating === selectedComplaint.id}
                          onClick={() => handleComplaintDelete(selectedComplaint.id)}
                          className="h-8 w-8 rounded-xl border-neutral-800 bg-neutral-950 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[360px] bg-neutral-950/20">
                    <div className="text-left space-y-3">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider">
                        Original Message
                      </span>
                      <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-xs italic text-neutral-300 leading-relaxed max-w-[90%]">
                        &ldquo;{selectedComplaint.message}&rdquo;
                      </div>
                    </div>

                    <Separator className="bg-neutral-800/60 my-4" />

                    <div className="text-left space-y-4">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">
                        AI Chat Transcript Stream
                      </span>

                      {transcriptLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                          <p className="text-[10px] text-neutral-500 font-mono">Retrieving conversation records...</p>
                        </div>
                      ) : activeTranscript && activeTranscript.length > 0 ? (
                        <div className="space-y-3.5">
                          {activeTranscript.map((msg, idx) => {
                            const isUser = msg.role?.toLowerCase() === "user";
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "flex flex-col max-w-[85%] rounded-2xl p-3.5 border text-xs leading-relaxed shadow-md",
                                  isUser
                                    ? "ml-auto bg-violet-600/10 border-violet-500/20 text-violet-300 rounded-tr-none"
                                    : "bg-neutral-900/50 border-neutral-800 text-neutral-300 rounded-tl-none"
                                )}
                              >
                                <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-500/80 mb-1">
                                  {isUser ? "Customer" : "AI Assistant"}
                                </span>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <MessageSquare className="w-10 h-10 text-neutral-800 mx-auto mb-2" />
                          <p className="text-xs text-neutral-500">No chat dialogue record associated with this ticket.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border-t border-neutral-800 bg-neutral-900/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase font-bold text-neutral-400 font-mono tracking-wider">
                        Internal Agent Activity Notes (Private)
                      </Label>
                      {editingNotesId !== selectedComplaint.id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingNotesId(selectedComplaint.id);
                            setNotesText(selectedComplaint.internalNotes || "");
                          }}
                          className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/5 h-7 rounded-lg text-xs"
                        >
                          {selectedComplaint.internalNotes ? "Edit logs" : "+ Log notes"}
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveNotes(selectedComplaint.id)}
                            className="text-green-400 hover:text-green-300 hover:bg-green-500/5 h-7 rounded-lg text-xs font-semibold"
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNotesId(null)}
                            className="text-neutral-500 hover:bg-white/5 h-7 rounded-lg text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    {editingNotesId === selectedComplaint.id ? (
                      <Textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Describe details regarding refunds, updates, or other manual operations..."
                        className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs focus-visible:ring-violet-500 text-neutral-200 resize-none h-20"
                      />
                    ) : (
                      <div className="text-xs text-neutral-400 leading-relaxed italic min-h-[30px] flex items-center bg-neutral-950/45 p-3 border border-neutral-800/40 rounded-xl">
                        {selectedComplaint.internalNotes ? (
                          <span>&ldquo;{selectedComplaint.internalNotes}&rdquo;</span>
                        ) : (
                          <span className="text-neutral-600 font-light font-mono text-[11px]">No activity history logged. Click button to edit notes.</span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="h-full border border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-neutral-500 min-h-[500px]">
                  <Inbox className="w-16 h-16 text-neutral-800 mb-4" />
                  <h3 className="font-bold text-base text-neutral-400">No Ticket Selected</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1 leading-relaxed">
                    Select a ticket from the left queue to view user details, message history transcripts, and actions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PRODUCTS MASTER-DETAIL */}
        {activeTab === "products" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
            {/* Left list of products */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-neutral-900/35 border border-neutral-855 p-4 rounded-2xl space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-[50%] translate-y-[-50%] w-3.5 h-3.5 text-neutral-500" />
                  <Input
                    placeholder="Search catalog..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 h-9 rounded-xl bg-neutral-950 border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="h-8 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 px-2 text-[10px] w-full focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    {productCategories.map((c) => (
                      <option key={c} value={c}>{c.replace("_", " ")}</option>
                    ))}
                  </select>

                  <Button
                    onClick={handleOpenAddProduct}
                    className="h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shrink-0 px-3 shadow"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add New
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-270px)] border border-neutral-800 bg-[#09090f]/30 rounded-2xl">
                <div className="p-3 space-y-2">
                  {filteredProducts.map((p) => {
                    const isSelected = selectedProductId === p.id && !isAddingProduct;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setIsAddingProduct(false);
                          setProductForm({
                            name: p.name,
                            description: p.description,
                            price: String(p.price),
                            category: p.category,
                            stock: String(p.stock),
                            imageUrl: p.imageUrl,
                            details: p.details || "",
                          });
                        }}
                        className={cn(
                          "p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left flex gap-3 items-center",
                          isSelected ? "bg-[#141424] border-violet-500/40 shadow-lg" : "bg-neutral-900/35 border-neutral-800/80 hover:bg-neutral-900/60"
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800/60 flex items-center justify-center shrink-0 overflow-hidden">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="object-cover w-full h-full" onError={(e) => (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=100"} />
                          ) : (
                            <Package className="w-4 h-4 text-neutral-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-white truncate">{p.name}</h4>
                          <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-semibold font-mono block mt-0.5">
                            {p.category.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-violet-400">${p.price.toFixed(2)}</p>
                          <span className={cn("text-[9px] font-bold block mt-0.5", p.stock > 0 ? "text-neutral-400" : "text-red-500")}>
                            {p.stock > 0 ? `${p.stock} units` : "Sold Out"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="p-8 text-center text-neutral-500 text-xs">No products in catalog.</div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right side editor pane */}
            <div className="lg:col-span-2">
              {selectedProduct || isAddingProduct ? (
                <Card className="border-neutral-800 bg-[#09090f]/35 rounded-2xl border p-6">
                  <div className="text-left mb-6 border-b border-neutral-800 pb-4">
                    <span className="text-[9px] text-violet-400 font-bold uppercase tracking-widest font-mono">
                      {isAddingProduct ? "Catalog Creator" : "Catalog Editor"}
                    </span>
                    <h3 className="text-base font-bold font-outfit text-white mt-1">
                      {isAddingProduct ? "Publish New Product Listing" : `Manage Listing Details`}
                    </h3>
                    {!isAddingProduct && selectedProduct && (
                      <p className="text-[10px] text-neutral-500 font-mono mt-1 select-all">ID: {selectedProduct.id}</p>
                    )}
                  </div>

                  <form onSubmit={handleSaveProduct} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-neutral-400 font-semibold">Listing Title *</Label>
                      <Input
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        placeholder="EcoComfort Ergonomic Chair"
                        className="bg-neutral-950 border-neutral-800 h-9 rounded-xl text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-400 font-semibold">Retail Price ($) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          placeholder="199.99"
                          className="bg-neutral-950 border-neutral-800 h-9 rounded-xl font-mono text-xs"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-400 font-semibold">Inventory Stock *</Label>
                        <Input
                          type="number"
                          value={productForm.stock}
                          onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                          placeholder="50"
                          className="bg-neutral-950 border-neutral-800 h-9 rounded-xl font-mono text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-400 font-semibold">Category Type *</Label>
                        <select
                          value={productForm.category}
                          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl h-9 px-3 text-xs text-neutral-300 focus:outline-none"
                        >
                          <option value="electronics">Electronics</option>
                          <option value="clothing">Clothing</option>
                          <option value="home_garden">Home & Garden</option>
                          <option value="sports">Sports</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-400 font-semibold">Image Asset Path</Label>
                        <Input
                          value={productForm.imageUrl}
                          onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                          placeholder="/images/electronics/laptop.png"
                          className="bg-neutral-950 border-neutral-800 h-9 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-neutral-400 font-semibold">Brief Summary Description</Label>
                      <Textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        placeholder="Ergonomically designed chair made from recycled ocean plastics..."
                        className="bg-neutral-950 border-neutral-800 rounded-xl h-16 text-xs resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-neutral-400 font-semibold">Advanced Tech Details</Label>
                      <Textarea
                        value={productForm.details}
                        onChange={(e) => setProductForm({ ...productForm, details: e.target.value })}
                        placeholder="Dimensions, materials, specifications, voltage, weights..."
                        className="bg-neutral-950 border-neutral-800 rounded-xl h-20 text-xs resize-none font-mono text-[11px]"
                      />
                    </div>

                    <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
                      {selectedProduct && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleDeleteProduct(selectedProduct.id)}
                          className="border border-red-500/10 bg-red-500/5 hover:bg-red-500/15 text-red-400 rounded-xl h-10 px-4 text-xs font-semibold"
                        >
                          Delete Product Listing
                        </Button>
                      )}
                      <div className="flex gap-2.5 ml-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setIsAddingProduct(false);
                            if (filteredProducts.length > 0) setSelectedProductId(filteredProducts[0].id);
                          }}
                          className="border border-neutral-800 rounded-xl h-10 px-4 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl h-10 px-6 text-xs shadow-md shadow-violet-600/10"
                        >
                          Save Product Listing
                        </Button>
                      </div>
                    </div>
                  </form>
                </Card>
              ) : (
                <div className="h-full border border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-neutral-500 min-h-[500px]">
                  <Inbox className="w-16 h-16 text-neutral-800 mb-4" />
                  <h3 className="font-bold text-base text-neutral-400">No Product Selected</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    Select a product listing from the left queue or click &ldquo;+ Add New&rdquo; to configure inventories.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: FAQs MASTER-DETAIL */}
        {activeTab === "faqs" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
            {/* Left list of FAQs */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-neutral-900/35 border border-neutral-855 p-4 rounded-2xl space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-[50%] translate-y-[-50%] w-3.5 h-3.5 text-neutral-500" />
                  <Input
                    placeholder="Search FAQ questions..."
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    className="pl-9 h-9 rounded-xl bg-neutral-950 border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-500"
                  />
                </div>
                <Button
                  onClick={handleOpenAddFaq}
                  className="w-full h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center justify-center shadow"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> New Question
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-270px)] border border-neutral-800 bg-[#09090f]/30 rounded-2xl">
                <div className="p-3 space-y-2">
                  {filteredFaqs.map((faq) => {
                    const isSelected = selectedFaq?.id === faq.id && !isAddingFaq;
                    return (
                      <div
                        key={faq.id}
                        onClick={() => {
                          setSelectedFaqId(faq.id);
                          setIsAddingFaq(false);
                          setFaqForm({ question: faq.question, answer: faq.answer });
                        }}
                        className={cn(
                          "p-3.5 rounded-xl border transition-all duration-200 cursor-pointer text-left relative",
                          isSelected ? "bg-[#141424] border-violet-500/40 shadow-lg" : "bg-neutral-900/35 border-neutral-800/80 hover:bg-neutral-900/60"
                        )}
                      >
                        <div className="flex gap-2">
                          <div className="w-5 h-5 rounded bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                            Q
                          </div>
                          <h4 className="font-bold text-xs text-white line-clamp-2 leading-relaxed">
                            {faq.question}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                  {filteredFaqs.length === 0 && (
                    <div className="p-8 text-center text-neutral-500 text-xs">No FAQs logged in index.</div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right side FAQ editor form */}
            <div className="lg:col-span-2">
              {selectedFaq || isAddingFaq ? (
                <Card className="border-neutral-800 bg-[#09090f]/35 rounded-2xl border p-6">
                  <div className="text-left mb-6 border-b border-neutral-800 pb-4">
                    <span className="text-[9px] text-violet-400 font-bold uppercase tracking-widest font-mono">
                      {isAddingFaq ? "FAQ Creator" : "FAQ Editor"}
                    </span>
                    <h3 className="text-base font-bold font-outfit text-white mt-1">
                      {isAddingFaq ? "Sync New FAQ Question" : "Modify Knowledge Entry"}
                    </h3>
                  </div>

                  <form onSubmit={handleSaveFaq} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-neutral-400 font-semibold">Question Query *</Label>
                      <Input
                        value={faqForm.question}
                        onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                        placeholder="What is the standard delivery shipping window?"
                        className="bg-neutral-950 border-neutral-800 h-10 rounded-xl text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-neutral-400 font-semibold">Answer Explanation *</Label>
                      <Textarea
                        value={faqForm.answer}
                        onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                        placeholder="Our orders generally ship within 24 hours via UPS. Deliveries typically arrive in 3-5 business days."
                        className="bg-neutral-950 border-neutral-800 rounded-xl h-44 text-xs resize-none leading-relaxed"
                        required
                      />
                    </div>

                    <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
                      {selectedFaq && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleDeleteFaq(selectedFaq.id)}
                          className="border border-red-500/10 bg-red-500/5 hover:bg-red-500/15 text-red-400 rounded-xl h-10 px-4 text-xs font-semibold"
                        >
                          Delete FAQ Entry
                        </Button>
                      )}
                      <div className="flex gap-2.5 ml-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setIsAddingFaq(false);
                            if (filteredFaqs.length > 0) setSelectedFaqId(filteredFaqs[0].id);
                          }}
                          className="border border-neutral-800 rounded-xl h-10 px-4 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl h-10 px-6 text-xs shadow-md shadow-violet-600/10"
                        >
                          Sync FAQ Entry
                        </Button>
                      </div>
                    </div>
                  </form>
                </Card>
              ) : (
                <div className="h-full border border-dashed border-neutral-800 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-neutral-500 min-h-[500px]">
                  <Inbox className="w-16 h-16 text-neutral-800 mb-4" />
                  <h3 className="font-bold text-base text-neutral-400">No FAQ Selected</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mt-1">
                    Select a question from the left queue or click &ldquo;New Question&rdquo; to configure chatbot responses.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Isolated Analytics Dashboard Panel ──
function AnalyticsPanel() {
  const { getToken } = useAuth();
  const [data, setData] = useState<AnalyticsData>({
    volume: null,
    performance: null,
    topics: null,
    complaints: null,
    business: null,
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async (skipSetLoading = false) => {
    if (!skipSetLoading) {
      setData((prev) => ({ ...prev, loading: true, error: null }));
    }
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const [vol, perf, top, comp, biz] = await Promise.all([
        fetch(`${API_BASE}/analytics/conversation-volume`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/analytics/performance`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/analytics/topics`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/analytics/complaints`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/analytics/business`, { headers }).then((r) => r.json()),
      ]);
      setData({
        volume: vol,
        performance: perf,
        topics: top,
        complaints: comp,
        business: biz,
        loading: false,
        error: null,
      });
    } catch (e) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load active metrics. Confirm the FastAPI backend is running.",
      }));
    }
  }, [getToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAll(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAll]);

  if (data.loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 border border-neutral-800 rounded-2xl bg-neutral-900/10">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-xs text-neutral-500 font-mono">Parsing metrics stream...</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 border border-red-500/10 bg-red-500/5 rounded-2xl">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-xs text-neutral-400 font-mono">{data.error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAll()}
          className="border-neutral-800 bg-neutral-950 text-neutral-300 rounded-lg text-xs"
        >
          Retry Load
        </Button>
      </div>
    );
  }

  const vol = data.volume || {} as VolumeData;
  const perf = data.performance || {} as PerformanceData;
  const top = data.topics || {} as TopicsData;
  const comp = data.complaints || {} as ComplaintsData;
  const biz = data.business || {} as BusinessData;

  const volTotals = vol.totals;
  const bizTotals = biz.totals;
  const compTotals = comp.totals;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Messages",
            value: volTotals?.total_messages?.toLocaleString() ?? "—",
            sub: `${volTotals?.unique_users ?? 0} active sessions`,
            icon: MessageSquare,
            gradient: "from-violet-600/10 to-transparent",
          },
          {
            label: "AI Bot Answers",
            value: volTotals?.assistant_messages?.toLocaleString() ?? "—",
            sub: `${volTotals?.user_messages ?? 0} user inputs`,
            icon: Activity,
            gradient: "from-fuchsia-600/10 to-transparent",
          },
          {
            label: "Completed Orders",
            value: bizTotals?.total_orders?.toLocaleString() ?? "—",
            sub: `Avg $${bizTotals?.avg_order_value?.toFixed(2) ?? "0.00"} value`,
            icon: ShoppingBag,
            gradient: "from-emerald-600/10 to-transparent",
          },
          {
            label: "Direct Revenue",
            value: `$${bizTotals?.total_revenue?.toFixed(2) ?? "0.00"}`,
            sub: `${compTotals?.open ?? 0} open tickets`,
            icon: DollarSign,
            gradient: "from-amber-600/10 to-transparent",
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card
              key={idx}
              className="border-neutral-800 bg-neutral-900/15 backdrop-blur-md rounded-2xl overflow-hidden relative group border text-left"
            >
              <div className={cn("absolute inset-0 bg-gradient-to-tr opacity-20 transition-opacity group-hover:opacity-30", card.gradient)} />
              <CardContent className="p-5 flex items-center gap-4 relative">
                <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
                    {card.label}
                  </span>
                  <p className="text-xl font-bold font-outfit text-white mt-0.5">{card.value}</p>
                  <p className="text-[10px] text-neutral-400 font-medium mt-0.5">{card.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Daily Volume (2 columns width) */}
        <Card className="xl:col-span-2 border-neutral-800 bg-neutral-900/20 rounded-2xl border text-left">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Daily Conversation Volumes
            </CardTitle>
            <CardDescription className="text-[10px] text-neutral-500">
              Message frequency stats over the past month.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {vol.volume_by_day && vol.volume_by_day.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={vol.volume_by_day} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0f",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      fontSize: 11,
                      color: "#fff",
                    }}
                  />
                  <Area type="monotone" dataKey="user" name="Customer" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#userGrad)" />
                  <Area type="monotone" dataKey="assistant" name="AI Bot" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#aiGrad)" />
                  <Legend wrapperStyle={{ fontSize: 10, color: "#64748b", paddingTop: 10 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-24 text-center text-neutral-500 text-xs font-mono">No telemetry volumes recorded.</div>
            )}
          </CardContent>
        </Card>

        {/* Pathway distribution */}
        <Card className="xl:col-span-1 border-neutral-800 bg-neutral-900/20 rounded-2xl border text-left">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              AI Intent Routing
            </CardTitle>
            <CardDescription className="text-[10px] text-neutral-500">
              Distribution of incoming user query paths.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col items-center justify-center">
            {perf.pathways && perf.pathways.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={perf.pathways}
                      dataKey="count"
                      nameKey="pathway"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {perf.pathways.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0a0a0f",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        fontSize: 10,
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full grid grid-cols-2 gap-2 mt-2">
                  {perf.pathways.map((row, idx) => (
                    <div key={row.pathway} className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="truncate" title={row.pathway}>
                        {row.pathway} ({row.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-neutral-500 text-xs font-mono">No routing history available.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latency & Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Path latency */}
        <Card className="border-neutral-800 bg-neutral-900/20 rounded-2xl border text-left">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Avg Latency by Route
            </CardTitle>
            <CardDescription className="text-[10px] text-neutral-500">
              Response generation speeds in seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {perf.pathways && perf.pathways.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={perf.pathways} layout="vertical" margin={{ top: 0, right: 10, left: 35, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#64748b", fontSize: 9 }} />
                  <YAxis type="category" dataKey="pathway" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0f",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      fontSize: 10,
                      color: "#fff",
                    }}
                    formatter={(v) => [`${v}s`, "Latency"]}
                  />
                  <Bar dataKey="avg" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={12}>
                    {perf.pathways.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-16 text-center text-neutral-500 text-xs font-mono">No latency diagnostics logged.</div>
            )}
          </CardContent>
        </Card>

        {/* Top Keywords */}
        <Card className="border-neutral-800 bg-neutral-900/20 rounded-2xl border text-left">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Topic Word Mentions
            </CardTitle>
            <CardDescription className="text-[10px] text-neutral-500">
              Top keywords identified in complaints/messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {top.keywords && top.keywords.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={top.keywords} layout="vertical" margin={{ top: 0, right: 10, left: 25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#64748b", fontSize: 9 }} />
                  <YAxis type="category" dataKey="word" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0f",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      fontSize: 10,
                      color: "#fff",
                    }}
                    formatter={(v) => [v, "Frequency"]}
                  />
                  <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={12}>
                    {top.keywords.map((_, idx) => (
                      <Cell key={idx} fill={`hsl(${280 + idx * 10}, 65%, ${55 - idx * 2.5}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-16 text-center text-neutral-500 text-xs font-mono font-light">No words analyzed yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
