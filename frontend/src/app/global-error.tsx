"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GLOBAL RUNTIME ERROR]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <head>
        <title>LuxeCatalog | System Error</title>
      </head>
      <body className="min-h-screen bg-[#030712] text-slate-100 font-sans p-4 sm:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl p-6 sm:p-10 bg-[#1f2937]/50 border border-red-500/20 rounded-[2.5rem] shadow-2xl backdrop-blur-xl space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-white/5 pb-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 text-3xl">
              ⚠️
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">System Initialization Failure</h1>
              <p className="text-sm text-slate-400 mt-1">Next.js failed to initialize the RootLayout of the application.</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Error Message</span>
            <div className="p-5 bg-slate-950/80 rounded-2xl border border-white/5 text-red-400 font-mono text-sm font-semibold select-all leading-relaxed break-all">
              {error.name || "Error"}: {error.message || "Unknown global error"}
            </div>
          </div>

          {error.stack && (
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Traceback</span>
              <pre className="p-5 bg-slate-950/80 rounded-2xl border border-white/5 text-[11px] font-mono text-slate-300 overflow-auto max-h-[350px] select-all whitespace-pre-wrap leading-relaxed break-all">
                {error.stack}
              </pre>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-white/5 justify-between">
            <button
              onClick={() => reset()}
              className="h-12 px-8 rounded-2xl text-sm font-semibold bg-white text-black hover:bg-white/90 active:scale-95 transition-all"
            >
              Try Re-initializing
            </button>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold text-center sm:text-right">
              Server: AWS Amplify Hosting • Environment: Production
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
