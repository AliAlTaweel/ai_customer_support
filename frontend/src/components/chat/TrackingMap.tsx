"use client";

import { motion } from "framer-motion";
import { Truck, MapPin, Navigation, Package, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TrackingData {
  status: string;
  deliveryMessage?: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
  progress: number;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  milestones: Array<{ status: string; time: string; completed: boolean }>;
}

export default function TrackingMap({ data }: { data: TrackingData }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-4 p-5 bg-secondary/10 rounded-[2.5rem] border border-primary/10 mx-1 mb-4 shadow-xl backdrop-blur-md overflow-hidden relative"
    >
      {/* Decorative Background Map (SVG) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 200C100 150 200 250 300 200C400 150 500 250 600 200C700 150 800 250 800 200" stroke="currentColor" strokeWidth="2" />
          <path d="M0 100C150 50 250 150 400 100C550 50 650 150 800 100" stroke="currentColor" strokeWidth="1" />
          <path d="M0 300C100 250 300 350 500 300C700 250 800 350 800 300" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      {/* Status Header */}
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge 
              variant={data.status === "SHIPPED" ? "default" : "secondary"}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                data.status === "SHIPPED" ? "bg-green-500/10 text-green-500 border-green-500/20" : ""
              )}
            >
              {data.status}
            </Badge>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Order Tracking</span>
          </div>
          <h4 className="font-outfit font-bold text-lg leading-tight">
            {data.deliveryMessage || "On its way to you"}
          </h4>
        </div>
        <div className="text-right">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center ml-auto mb-1">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter block">Carrier: {data.carrier}</span>
        </div>
      </div>

      <div className="flex items-center justify-between relative z-10 bg-background/40 p-3 rounded-2xl border border-primary/5">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Tracking Number</span>
          <span className="text-xs font-mono font-bold">{data.trackingNumber}</span>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter block">Estimated Delivery</span>
          <span className="text-sm font-black text-primary font-outfit">{data.estimatedDelivery}</span>
        </div>
      </div>

      {/* Visual Progress Path */}
      <div className="relative h-24 bg-background/40 rounded-2xl border border-primary/5 flex items-center px-8 overflow-hidden">
        {/* The Track */}
        <div className="absolute left-10 right-10 h-0.5 bg-primary/10 top-1/2 -translate-y-1/2" />
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${data.progress * 100}%` }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute left-10 h-1 bg-primary top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(var(--primary),0.5)]"
        />

        {/* Origin Pin */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <span className="text-[8px] font-bold text-muted-foreground mt-6 absolute w-20 text-center uppercase tracking-tighter">Warehouse</span>
        </div>

        {/* Current Truck Position */}
        <motion.div 
          initial={{ left: "10%" }}
          animate={{ left: `${10 + data.progress * 75}%` }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-1/2 -translate-y-1/2 -ml-4"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground">
              <Truck className="w-4 h-4" />
            </div>
            {/* Pulsing Ring */}
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full bg-primary/30 -z-10"
            />
          </div>
        </motion.div>

        {/* Destination Pin */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <MapPin className="w-5 h-5 text-muted-foreground/30 mb-6 absolute" />
          <div className="w-4 h-4 rounded-full bg-secondary border border-primary/10" />
          <span className="text-[8px] font-bold text-muted-foreground mt-6 absolute w-20 text-center uppercase tracking-tighter">You</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-background/50 p-3 rounded-xl border border-primary/5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Navigation className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] font-bold text-muted-foreground uppercase block">Current Location</span>
            <span className="text-[10px] font-bold truncate block">
              {data.origin?.name ? `${data.origin.name.split(',')[0]} Transit` : "In Transit"}
            </span>
          </div>
        </div>
        <div className="bg-background/50 p-3 rounded-xl border border-primary/5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] font-bold text-muted-foreground uppercase block">Security</span>
            <span className="text-[10px] font-bold truncate block">Luxe Verified</span>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-2 mt-1">
        {data.milestones.map((ms, i) => (
          <div key={i} className="flex items-center gap-3 px-1">
            <div className={`w-1.5 h-1.5 rounded-full ${ms.completed ? 'bg-primary' : 'bg-primary/10'}`} />
            <div className="flex-1 flex items-center justify-between">
              <span className={`text-[11px] font-medium ${ms.completed ? 'text-foreground' : 'text-muted-foreground'}`}>{ms.status}</span>
              <span className="text-[10px] font-bold opacity-30">{ms.time}</span>
            </div>
          </div>
        ))}
      </div>

      <Button 
        variant="ghost" 
        className="w-full mt-2 h-9 text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
        onClick={() => window.open(`https://www.ups.com/track?tracknum=${data.trackingNumber}`, '_blank')}
      >
        View Full Details on UPS.com
      </Button>
    </motion.div>
  );
}
