"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bot, Package, CheckCircle2, Clock, Send } from "lucide-react";
import { ConversationState } from "@/lib/ai/types";

interface ActionProps {
  onSend: (msg: string) => void;
}

export function PendingConfirmation({ state, onSend }: { state: ConversationState; onSend: ActionProps["onSend"] }) {
  if (!state.pending_confirmation) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 p-4 bg-secondary/20 rounded-2xl border border-primary/10 mx-1 mb-2 shadow-sm"
    >
      <div className="flex items-center gap-2 text-primary">
        <Bot className="w-4 h-4" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Action Required</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Would you like to cancel order <strong>{state.pending_confirmation}</strong>?
      </p>
      <div className="flex gap-2 pt-1">
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1 rounded-xl h-9 text-xs font-bold shadow-md shadow-primary/10"
          onClick={() => onSend("yes")}
        >
          Confirm
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 rounded-xl h-9 text-xs font-bold bg-background border-primary/5 hover:bg-primary/5"
          onClick={() => onSend("no")}
        >
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

export function PendingOrderSummary({ state, onSend }: { state: ConversationState; onSend: ActionProps["onSend"] }) {
  if (!state.pending_order_summary) return null;
  
  const summary = state.pending_order_summary;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-3.5 p-4 bg-secondary/10 rounded-[2rem] border border-primary/10 mx-1 mb-3 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 text-primary">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Package className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]">Purchase Details</span>
      </div>
      
      {typeof summary === 'string' ? (
        <p className="text-xs text-muted-foreground leading-relaxed break-words">
          {summary}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            {summary.imageUrl && (
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white border border-primary/5 shadow-sm">
                <img 
                  src={summary.imageUrl} 
                  alt={summary.product_name} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <h4 className="font-bold text-[15px] leading-tight text-foreground/90 font-outfit truncate">
                {summary.product_name || summary.name || "Product"}
              </h4>
              <p className="text-lg font-black text-primary font-sans">
                ${(Number(summary.price || summary.amount) || 0).toFixed(2)}
              </p>
              {summary.estimated_delivery && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight">
                    {summary.estimated_delivery}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {summary.details && (
            <div className="bg-background/50 rounded-xl p-3 border border-primary/5">
              <p className="text-[11px] text-muted-foreground leading-normal font-outfit line-clamp-2">
                {summary.details}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2.5 mt-1">
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1 rounded-xl h-10 font-bold shadow-md shadow-primary/10"
          onClick={() => onSend("yes")}
        >
          Checkout
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 rounded-xl h-10 font-bold bg-background border-primary/5"
          onClick={() => onSend("no")}
        >
          Maybe Later
        </Button>
      </div>
    </motion.div>
  );
}

export function PendingYesNo({ state, onSend }: { state: ConversationState; onSend: ActionProps["onSend"] }) {
  if (!state.pending_yes_no) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-3 p-4 bg-secondary/10 rounded-2xl border border-primary/10 mx-1 mb-3 shadow-md"
    >
      <div className="flex items-center gap-2 text-primary">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">Confirmation</span>
      </div>
      <p className="text-xs font-medium text-foreground/80 leading-relaxed font-outfit break-words">
        {state.pending_yes_no}
      </p>
      <div className="flex gap-2 pt-1">
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1 rounded-xl h-9 text-xs font-bold"
          onClick={() => onSend("yes")}
        >
          Confirm
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 rounded-xl h-9 text-xs font-bold bg-background"
          onClick={() => onSend("no")}
        >
          Not Now
        </Button>
      </div>
    </motion.div>
  );
}

export function PendingProductList({ state, onSend }: { state: ConversationState; onSend: ActionProps["onSend"] }) {
  if (!state.pending_product_list) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 mb-4"
    >
      <div className="flex items-center gap-2 px-2 text-primary">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <Package className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest">Recommended Products</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 snap-x scrollbar-hide -mx-1">
        {state.pending_product_list.map((product, i) => (
          <motion.div 
            key={product.id || product.name || i}
            whileHover={{ y: -4 }}
            className="flex-shrink-0 w-[240px] snap-start bg-background border border-primary/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <div className="h-32 bg-secondary/20 relative group">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-primary/20" />
                </div>
              )}
              <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm border border-primary/5">
                <span className="text-sm font-black text-primary">${product.price}</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <h4 className="font-bold text-[14px] leading-tight text-foreground/90 font-outfit line-clamp-1">
                  {product.name}
                </h4>
                <p className="text-[11px] text-muted-foreground line-clamp-2 font-outfit leading-normal h-8">
                  {product.description || "Premium Luxe product quality guaranteed."}
                </p>
              </div>
              <Button 
                variant="default" 
                size="sm" 
                className="w-full rounded-xl h-9 font-bold text-xs shadow-md shadow-primary/5 group/btn"
                onClick={() => onSend(`I want to buy the ${product.name}`)}
              >
                Select Product
                <Send className="w-3 h-3 ml-2 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
