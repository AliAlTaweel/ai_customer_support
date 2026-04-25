"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/lib/store/useCart";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, CreditCard, Wallet, Apple, ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function CheckoutPage() {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CREDIT_CARD");

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
  });

  useEffect(() => {
    setMounted(true);
    if (mounted && items.length === 0) {
      router.push("/shop");
    }
  }, [mounted, items, router]);

  if (!mounted || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const orderItems = items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      const shipping = {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country,
      };

      const result = await createOrder(
        orderItems, 
        totalPrice(), 
        shipping, 
        paymentMethod,
        formData.name
      );

      if (result.success) {
        clearCart();
        router.push(`/checkout/success?orderId=${result.orderId}`);
      } else {
        alert(result.error || "Failed to place order");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(totalPrice());

  const paymentMethods = [
    { id: "CREDIT_CARD", label: "Credit Card", icon: CreditCard },
    { id: "PAYPAL", label: "PayPal", icon: Wallet },
    { id: "APPLE_PAY", label: "Apple Pay", icon: Apple },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <Link 
        href="/shop" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group"
      >
        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Shopping
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold font-outfit tracking-tight">Shipping Details</h2>
            </div>

            <Card className="border-none bg-secondary/20 backdrop-blur-md shadow-sm">
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Full Name</label>
                    <Input 
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="h-12 bg-background/50 border-primary/5 focus:border-primary/20 transition-all rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Country</label>
                    <Input 
                      name="country"
                      placeholder="United States"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="h-12 bg-background/50 border-primary/5 focus:border-primary/20 transition-all rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground ml-1">Street Address</label>
                  <Input 
                    name="address"
                    placeholder="123 Luxury Ave"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="h-12 bg-background/50 border-primary/5 focus:border-primary/20 transition-all rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">City</label>
                    <Input 
                      name="city"
                      placeholder="New York"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="h-12 bg-background/50 border-primary/5 focus:border-primary/20 transition-all rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">State / Province</label>
                    <Input 
                      name="state"
                      placeholder="NY"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="h-12 bg-background/50 border-primary/5 focus:border-primary/20 transition-all rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">ZIP / Postal Code</label>
                    <Input 
                      name="zip"
                      placeholder="10001"
                      value={formData.zip}
                      onChange={handleInputChange}
                      required
                      className="h-12 bg-background/50 border-primary/5 focus:border-primary/20 transition-all rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold font-outfit tracking-tight">Payment Method</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 gap-3 group relative overflow-hidden",
                      isSelected 
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                        : "border-primary/5 bg-secondary/20 hover:bg-secondary/40"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4 text-primary">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={cn(
                      "font-semibold text-sm font-outfit uppercase tracking-wider",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="border-none bg-secondary/30 backdrop-blur-xl shadow-2xl shadow-primary/5 sticky top-32 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 border-b border-primary/5 bg-secondary/20">
              <CardTitle className="text-2xl font-bold font-outfit">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center group">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-primary/5 shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-cover transition-transform group-hover:scale-110"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} × ${item.price}</p>
                    </div>
                    <p className="text-sm font-bold">${item.quantity * item.price}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-6 border-t border-primary/5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formattedTotal}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span className="text-green-500 font-medium">Free</span>
                </div>
                <div className="flex items-center justify-between text-xl font-bold font-outfit pt-4 border-t border-primary/5">
                  <span>Total</span>
                  <span className="text-primary">{formattedTotal}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-secondary/10">
              <Button 
                className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay {formattedTotal}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
             <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                <Card className="w-3 h-3 rounded-full bg-green-500 border-none shadow-sm shadow-green-500/50" />
                Secure Checkout Enabled
             </div>
             <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-[250px]">
                Your personal data will be used to process your order and support your experience throughout this website.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
