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
    setIsVisible(false);
    
    const details = {
      customer_name: `${formData.firstName} ${formData.lastName}`.trim(),
      customer_email: formData.email,
      shipping_address: formData.address,
      payment_method: formData.paymentMethod,
      items: safeItems.map(item => ({
        product_name: item.product_name,
        quantity: item.quantity
      }))
    };
    
    // Call onSubmit immediately so the parent can process and close the form
    onSubmit(details);
  };

  const safeItems = (Array.isArray(items) ? items : []).filter(Boolean);
  const totalPrice = safeItems.reduce((sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-4 p-6 bg-background/40 backdrop-blur-xl rounded-[2.5rem] border border-white/20 mx-2 mb-6 shadow-2xl relative overflow-hidden group"
    >
      {/* Premium Gradient Background Accent */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-700" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h4 className="font-bold text-base font-outfit tracking-tight">Secure Checkout</h4>
            <div className="flex items-center gap-1.5 opacity-60">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-[10px] uppercase tracking-widest font-extrabold">SSL Encrypted</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Product Summary Card */}
      <div className="space-y-2 relative z-10">
        <label className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40 ml-1">Order Summary</label>
        <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1 scrollbar-hide">
          {safeItems.map((item, idx) => (
            <div key={idx} className="bg-white/5 rounded-2xl p-3 border border-white/10 flex gap-4 transition-all hover:bg-white/10 group/item">
              {item.imageUrl && (
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/5 group-hover/item:scale-105 transition-transform">
                  <img 
                    src={item.imageUrl} 
                    alt={item.product_name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h5 className="font-bold text-sm truncate group-hover/item:text-primary transition-colors">{item.product_name}</h5>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded-lg opacity-70">
                    QTY: {item.quantity}
                  </span>
                  <span className="font-bold text-sm text-primary">
                    ${(Number(item?.price) || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mt-2 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-black opacity-50 ml-1">First Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                required
                disabled={isSubmitting}
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:opacity-30 disabled:opacity-50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-black opacity-50 ml-1">Last Name</label>
            <input
              required
              disabled={isSubmitting}
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:opacity-30 disabled:opacity-50"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-black opacity-50 ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              required
              disabled={isSubmitting}
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:opacity-30 disabled:opacity-50"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-black opacity-50 ml-1">Delivery Address</label>
          <div className="relative">
            <Truck className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground/50" />
            <textarea
              required
              disabled={isSubmitting}
              placeholder="Street name, City, Postcode"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:opacity-30 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-6">
          <div className="flex-shrink-0">
            <p className="text-[10px] uppercase tracking-[0.2em] font-black opacity-30">Total Price</p>
            <p className="text-2xl font-black text-primary tracking-tight">${totalPrice.toFixed(2)}</p>
          </div>
          <div className="flex gap-2 flex-1 justify-end">
            <Button 
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={onCancel}
              className="rounded-2xl h-14 px-6 font-bold hover:bg-white/5 transition-all text-muted-foreground"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="rounded-2xl h-14 px-8 font-extrabold flex items-center gap-3 shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all flex-1 sm:flex-none relative overflow-hidden group/btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Buying...
                </>
              ) : (
                <>
                  Buy
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
