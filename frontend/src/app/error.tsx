"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[NEXT RUNTIME ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 text-4xl mb-6 animate-bounce">
        ⚠️
      </div>
      
      <h2 className="text-3xl font-extrabold tracking-tight font-outfit mb-3 text-white">
        Something went wrong!
      </h2>
      
      <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
        An unexpected error occurred while rendering this page.
        <span className="block mt-2 font-mono text-xs text-red-400 bg-slate-900 p-3 rounded-xl border border-white/5 break-all">
          {error.message || "Unknown rendering error"}
        </span>
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
        <Button
          onClick={() => reset()}
          size="lg"
          className="h-12 px-8 rounded-2xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
        >
          Try Again
        </Button>
        <Button
          onClick={() => window.location.href = "/"}
          variant="ghost"
          size="lg"
          className="h-12 px-8 rounded-2xl text-sm font-medium hover:bg-secondary/50"
        >
          Go to Home
        </Button>
      </div>
    </div>
  );
}
