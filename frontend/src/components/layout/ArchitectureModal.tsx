"use client";

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Network, 
  Server, 
  Database, 
  ShieldCheck, 
  Zap, 
  Bot, 
  Globe,
  ArrowRight,
  ArrowDown
} from "lucide-react";

export function ArchitectureModal() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="hidden lg:flex gap-2 items-center font-outfit font-semibold border-primary/20 hover:border-primary/40 bg-background hover:bg-primary/5 rounded-full text-xs transition-all shadow-none">
          <Network className="w-3.5 h-3.5 text-primary" />
          System Architecture
        </Button>
      </SheetTrigger>
      
      {/* Target mobile/tablet small variant also */}
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden flex h-10 w-10 rounded-full border-primary/20 hover:border-primary/40 shadow-none">
          <Network className="w-4 h-4 text-primary" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[95%] sm:w-[540px] bg-background border-l border-primary/10 overflow-y-auto scrollbar-none">
        <SheetHeader className="space-y-1 mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Network className="w-5 h-5 text-primary" />
            </div>
            <SheetTitle className="text-2xl font-bold font-outfit tracking-tight">System Architecture</SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground">Under the hood of the LuxeCatalog Autonomous Pipeline.</p>
        </SheetHeader>

        <div className="space-y-10 pb-12">
          
          {/* 1. The Visual Pipeline Node Chart */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <ArrowRight className="w-3 h-3" /> Request Lifecyle Map
            </h3>
            
            <div className="bg-secondary/20 border border-border rounded-[2rem] p-6 space-y-3">
              
              {/* Step 1: Client */}
              <div className="flex items-center gap-4 bg-background border border-border/50 rounded-2xl p-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold font-outfit">Frontend Gateway</h4>
                  <p className="text-[11px] text-muted-foreground">Next.js 15 / Amplify Hosting</p>
                </div>
              </div>

              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-muted-foreground/40 animate-bounce" />
              </div>

              {/* Step 2: FastAPI & Security */}
              <div className="bg-background border border-primary/10 rounded-3xl p-4 relative overflow-hidden shadow-md">
                 <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50 pointer-events-none" />
                 
                 <div className="flex items-center gap-3 mb-3">
                    <div className="p-1.5 bg-teal-500/10 rounded-lg text-teal-500">
                      <Server className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider font-outfit">FastAPI Backend Core</h4>
                 </div>

                 <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2 text-xs bg-secondary/40 p-2 rounded-xl border border-border/50">
                       <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                       <span className="font-medium">PrivacyScrubber (GDPR Filter)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-secondary/40 p-2 rounded-xl border border-border/50">
                       <Zap className="w-3.5 h-3.5 text-amber-500" />
                       <span className="font-medium">Intent Router (Heuristic Bypass)</span>
                    </div>
                 </div>
              </div>

              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-muted-foreground/40" />
              </div>

              {/* Step 3: The Brain & Database split */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background border border-purple-500/20 rounded-2xl p-3 flex flex-col items-center text-center">
                  <Bot className="w-6 h-6 text-purple-500 mb-1.5" />
                  <span className="text-[11px] font-bold font-outfit">Gemini AI Engine</span>
                  <span className="text-[9px] text-muted-foreground">Multi-Agent Routing</span>
                </div>
                <div className="bg-background border border-blue-500/20 rounded-2xl p-3 flex flex-col items-center text-center">
                  <Database className="w-6 h-6 text-blue-500 mb-1.5" />
                  <span className="text-[11px] font-bold font-outfit">AWS RDS Postgres</span>
                  <span className="text-[9px] text-muted-foreground">ACID Transactions</span>
                </div>
              </div>

            </div>
          </div>

          {/* 2. Component breakdown text */}
          <div className="space-y-6">
             <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <ArrowRight className="w-3 h-3" /> Core Services
            </h3>

            <div className="grid gap-4">
              
              <div className="space-y-1 border-l-2 border-amber-500/30 pl-4">
                <h4 className="font-bold text-sm font-outfit flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Sub-100ms Heuristic Routing
                </h4>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Incoming traffic evaluates simple strings (greetings, direct status checks) against non-LLM regex dictionaries instantly, eliminating costly inference time and scaling efficiently.
                </p>
              </div>

              <div className="space-y-1 border-l-2 border-green-500/30 pl-4">
                <h4 className="font-bold text-sm font-outfit flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  GDPR Interceptor Proxy
                </h4>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Sensitive PII (names, phones, addresses) are stripped and replaced with reversible secure tokens before payloads reach model providers, strictly enforcing enterprise data privacy laws.
                </p>
              </div>

              <div className="space-y-1 border-l-2 border-purple-500/30 pl-4">
                <h4 className="font-bold text-sm font-outfit flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-purple-500" />
                  Autonomous Agentic Loops
                </h4>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  Built on Google Gemini architecture, agents operate dynamic Python tooling binds (SQL Alchemy / Vector Search) to decode intents into live database transactions autonomously.
                </p>
              </div>

            </div>
          </div>
          
        </div>
      </SheetContent>
    </Sheet>
  );
}
