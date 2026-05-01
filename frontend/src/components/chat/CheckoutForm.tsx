"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Truck, User, ArrowRight, X, Package, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckoutItem {
  product_name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  details?: string;
}

interface CheckoutFormProps {
  items: CheckoutItem[];
  onSubmit: (details: any) => void;
  onCancel: () => void;
  initialEmail?: string;
}

export default function CheckoutForm({ items, onSubmit, onCancel, initialEmail }: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: initialEmail || "",
    address: "",
    paymentMethod: "Credit Card",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const details = {
      customer_name: `${formData.firstName} ${formData.lastName}`.trim(),
      customer_email: formData.email,
      shipping_address: formData.address,
      payment_method: formData.paymentMethod,
      items: safeItems.map(item => ({
        product_name: item.product_name || (item as any).name || "Product",
        quantity: item.quantity
      }))
    };
    
    onSubmit(details);
  };

  const safeItems = (Array.isArray(items) ? items : []).filter(Boolean);
  const totalPrice = safeItems.reduce((sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col gap-4 p-5 bg-background border border-primary/10 rounded-[2rem] mx-1 mb-4 shadow-xl relative overflow-hidden group"
    >
      {/* Premium Glass Effect Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <CreditCard className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <h4 className="font-bold text-sm font-outfit">Secure Checkout</h4>
            <div className="flex items-center gap-1 opacity-50">
              <div className="w-1 h-1 rounded-full bg-green-500" />
              <span className="text-[9px] uppercase tracking-widest font-bold">Encrypted</span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onCancel}
          className="h-8 w-8 rounded-lg hover:bg-primary/5"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Product Summary */}
      <div className="space-y-2 relative z-10">
        <div className="flex items-center justify-between px-1">
          <label className="text-[9px] uppercase tracking-widest font-bold opacity-40">Your Selection</label>
          <span className="text-[9px] font-bold text-primary">{safeItems.length} {safeItems.length === 1 ? 'Item' : 'Items'}</span>
        </div>
        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-hide">
          {safeItems.map((item, idx) => (
            <div key={idx} className="bg-secondary/20 rounded-xl p-2.5 flex gap-3 border border-primary/5">
              {item.imageUrl && (
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm border border-primary/5">
                  <img 
                    src={item.imageUrl} 
                    alt={item.product_name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h5 className="font-bold text-xs truncate">{item.product_name || (item as any).name || "Product"}</h5>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] opacity-60">Qty: {item.quantity}</span>
                  <span className="font-bold text-xs text-primary">${(Number(item?.price || (item as any).amount) || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest font-bold opacity-40 ml-1">First Name</label>
            <input
              required
              disabled={isSubmitting}
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full h-10 bg-secondary/30 border border-transparent rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:opacity-30 disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest font-bold opacity-40 ml-1">Last Name</label>
            <input
              required
              disabled={isSubmitting}
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full h-10 bg-secondary/30 border border-transparent rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:opacity-30 disabled:opacity-50"
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[9px] uppercase tracking-widest font-bold opacity-40 ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              required
              disabled={isSubmitting}
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full h-10 bg-secondary/30 border border-transparent rounded-xl pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:opacity-30 disabled:opacity-50"
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[9px] uppercase tracking-widest font-bold opacity-40 ml-1">Shipping Address</label>
          <div className="relative">
            <Truck className="absolute left-3 top-3 w-3.5 h-3.5 text-muted-foreground/50" />
            <textarea
              required
              disabled={isSubmitting}
              placeholder="Complete shipping address..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-18 bg-secondary/30 border border-transparent rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none placeholder:opacity-30 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-primary/5 flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <p className="text-[8px] uppercase tracking-widest font-bold opacity-30">Total Amount</p>
            <p className="text-xl font-black text-primary tracking-tight">${totalPrice.toFixed(2)}</p>
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden group/btn"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <span>Complete Purchase</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </div>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
