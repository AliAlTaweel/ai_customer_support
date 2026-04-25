"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderIdProps {
  id: string;
}

export function OrderId({ id }: OrderIdProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className="group/id flex items-center gap-2 px-2 -ml-2 py-0.5 rounded-lg hover:bg-primary/5 transition-colors duration-200 text-left"
      title="Click to copy Order ID"
    >
      <span className="text-sm font-mono font-medium text-foreground tracking-tight">
        {id}
      </span>
      <div className="flex items-center justify-center w-5 h-5 rounded-md bg-background border border-primary/10 shadow-sm opacity-0 group-hover/id:opacity-100 transition-all duration-200">
        {copied ? (
          <Check className="w-3 h-3 text-green-500" />
        ) : (
          <Copy className="w-3 h-3 text-muted-foreground group-hover/id:text-primary" />
        )}
      </div>
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-[10px] font-bold rounded-md shadow-xl animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200">
          COPIED
        </span>
      )}
    </button>
  );
}
