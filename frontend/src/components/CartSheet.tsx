'use client';

import { useCart } from './CartProvider';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingBasket, Trash2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { checkoutAction } from '@/app/actions/checkout';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

export default function CartSheet() {
  const { cart, removeFromCart, clearCart, cartTotal, cartCount } = useCart();
  const { isSignedIn, isLoaded } = useUser();
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const isAddressValid = address.trim().length > 3; // Basic validation
  const canCheckout = isSignedIn && isAddressValid && !isSubmitting;

  const getButtonText = () => {
    if (isSubmitting) return "Processing...";
    if (!isLoaded) return "Checking status...";
    if (!isSignedIn) return "Sign in to Checkout";
    if (!isAddressValid) return "Enter Delivery Address";
    return "Complete Checkout";
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !address) return;

    setIsSubmitting(true);
    try {
      const result = await checkoutAction(new FormData(e.target as HTMLFormElement), cart, cartTotal);
      if (result.success) {
        setSuccess(true);
        clearCart();
        setTimeout(() => {
          setSuccess(false);
          router.push('/orders');
        }, 2000);
      }
    } catch (err: any) {
      alert(err.message || 'Checkout failed. Are you signed in?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cartTotal);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" className="relative group p-2 h-10 w-10 border-foreground/10 hover:border-primary/50 transition-colors">
            <ShoppingBasket className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center animate-in zoom-in">
                {cartCount}
              </span>
            )}
          </Button>
        }
      />
      <SheetContent className="flex flex-col w-full sm:max-w-md bg-white">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBasket className="w-5 h-5 text-primary" />
            Your Basket
          </SheetTitle>
          <SheetDescription>
            {cartCount === 0 ? "Your basket is empty." : `You have ${cartCount} items in your basket.`}
          </SheetDescription>
        </SheetHeader>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Order Confirmed!</h3>
            <p className="text-muted-foreground">Thank you for your purchase. We are preparing your order for shipment.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto mt-6 pl-2 pr-2">
              {cart.map((item) => (
                <div key={item.product_id} className="flex gap-4 p-4 border rounded-lg mb-3 bg-muted/20 group hover:border-primary/20 transition-all hover:translate-x-1">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <ShoppingBasket className="w-8 h-8 opacity-20" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-1">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{item.quantity} x ${item.price}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product_id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <form onSubmit={handleCheckout} className="mt-auto space-y-4 pt-6 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formattedTotal}</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Delivery Address</Label>
                  <Input 
                    id="address" 
                    name="address" 
                    placeholder="123 AI Street, Neural City..." 
                    required 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                    className="focus-visible:ring-primary"
                  />
                </div>
                <SheetFooter>
                  <Button 
                    type="submit" 
                    className={cn(
                      "w-full text-lg h-12 transition-all",
                      !canCheckout && "opacity-50 grayscale-[0.5]"
                    )} 
                    disabled={!canCheckout}
                  >
                    {getButtonText()}
                  </Button>
                </SheetFooter>
              </form>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
