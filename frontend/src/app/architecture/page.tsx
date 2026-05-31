import { 
  Network, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Server, 
  Database, 
  Globe, 
  ArrowRight,
  ArrowDown,
  Activity,
  Lock,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "System Architecture | LuxeCatalog",
  description: "Deep-dive technical visualization of the autonomous AI pipeline powering LuxeCatalog.",
};

import PerformanceTable from "./PerformanceTable";
import ProtocolDiagram from "./ProtocolDiagram";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-background pt-12 pb-24 px-4 sm:px-6 lg:px-8 font-outfit">
      <div className="container max-w-6xl mx-auto space-y-16">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-6 mt-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-bold tracking-widest uppercase">
            <Activity className="w-3 h-3" /> Engineering Technical Specifications
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter text-foreground font-sans">
            System Architecture
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed font-outfit font-light">
            A deep dive into the high-fidelity autonomous agent pipeline, featuring localized intent routing, GDPR pseudonymization, and decentralized PostgreSQL integration.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="rounded-full gap-2 font-semibold shadow-lg bg-[#171515] hover:bg-[#171515]/90 text-white border-none">
              <Link href="https://github.com/AliAlTaweel/ai_customer_support" target="_blank" rel="noreferrer">
                <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
                </svg>
                Explore Source Code
              </Link>
            </Button>
          </div>
        </div>

        <hr className="border-border/50 w-full" />

        {/* THE VISUAL DIAGRAM CANVAS */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Request Lifecycle Map</h2>
              <p className="text-sm text-muted-foreground">Visualizing dynamic pathways from UI dispatch to model synthesis.</p>
            </div>
          </div>

          <div className="p-6 sm:p-12 rounded-[2.5rem] bg-secondary/30 border border-border/50 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
            
            {/* Diagram Layout */}
            {/* NEW DEEP-TECH PIPELINE */}
            <div className="relative max-w-3xl mx-auto">
              {/* Central Connector Wire with Gradient Animation */}
              <div className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 bg-gradient-to-b from-blue-500 via-teal-500 to-purple-500 opacity-20 hidden md:block" />

              <div className="space-y-12 z-10 relative py-4">

                {/* STAGE 1: ENTRY */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 group">
                  <div className="w-full md:w-1/2 flex flex-col items-center md:items-end text-center md:text-right gap-2 order-2 md:order-1">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-blue-500 transition-colors">Client Egress</h3>
                    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">Dynamic React payload transmission via highly typed Next.js 15 API route handlers.</p>
                    <div className="flex gap-2 mt-1">
                       <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5">Typescript</Badge>
                       <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5">Clerk auth</Badge>
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center order-1 md:order-2 mt-1">
                    <div className="w-14 h-14 rounded-full bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform z-10 bg-background">
                       <Globe className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 hidden md:block order-3" />
                </div>

                {/* STAGE 2: PRIVACY */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 group">
                  <div className="w-full md:w-1/2 hidden md:block order-1" />
                  <div className="relative flex items-center justify-center order-1 md:order-2 mt-1">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform z-10 bg-background">
                       <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left gap-2 order-2 md:order-3">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-emerald-500 transition-colors">PrivacyScrubber System</h3>
                    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">Deterministic zero-leakage hashing algorithm transforms PII (Emails, Names) into reversible hash maps before reaching external LLMs.</p>
                    <Badge variant="outline" className="text-[11px] font-semibold px-2 py-0.5 text-emerald-600 border-emerald-500/30 bg-emerald-500/5">GDPR Phase</Badge>
                  </div>
                </div>

                {/* STAGE 3: ROUTING */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 group">
                  <div className="w-full md:w-1/2 flex flex-col items-center md:items-end text-center md:text-right gap-2 order-2 md:order-1">
                    <div className="flex items-center gap-2 justify-end">
                      <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-none text-[11px] px-2 py-0.5 font-semibold">LiteLLM Layer</Badge>
                      <h3 className="text-xl font-bold text-foreground group-hover:text-amber-500 transition-colors">Traffic Controller</h3>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">Heuristic keyword scanner + sub-100ms intent classifier determines processing track (Fast-Track cached vs Complex reasoning).</p>
                  </div>
                  <div className="relative flex items-center justify-center order-1 md:order-2 mt-1">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform z-10 bg-background">
                       <Zap className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 hidden md:block order-3" />
                </div>

                {/* STAGE 4: AGENT (CORE) */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 group">
                  <div className="w-full md:w-1/2 hidden md:block order-1" />
                  <div className="relative flex items-center justify-center order-1 md:order-2 mt-1">
                    <div className="w-16 h-16 -ml-1 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/30 group-hover:-rotate-3 transition-all z-10 relative">
                       <Cpu className="w-8 h-8 animate-pulse" />
                       <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left gap-2 order-2 md:order-3">
                    <div className="bg-gradient-to-r from-purple-500/5 to-transparent p-5 rounded-r-2xl border-l-4 border-purple-500 w-full max-w-md shadow-sm bg-background/40 backdrop-blur-sm">
                      <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Native Agent Orchestration</h3>
                      <p className="text-[13px] sm:text-sm text-muted-foreground font-medium mt-1.5 leading-relaxed">Unified specialist orchestrating tools via Google Gemini direct function calling.</p>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="text-xs p-3 bg-background border rounded-xl border-purple-200 dark:border-purple-900 flex flex-col shadow-sm">
                          <span className="font-bold text-purple-600 mb-0.5">Model Backbone</span>
                          <span className="font-medium opacity-80">Gemini Flash</span>
                        </div>
                        <div className="text-xs p-3 bg-background border rounded-xl border-purple-200 dark:border-purple-900 flex flex-col shadow-sm">
                          <span className="font-bold text-purple-600 mb-0.5">Context Window</span>
                          <span className="font-medium opacity-80">Dynamic sliding sync</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STAGE 5: DATA & TOOLS */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 group">
                  <div className="w-full md:w-1/2 flex flex-col items-center md:items-end text-center md:text-right gap-3 order-2 md:order-1">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-sky-500 transition-colors">Recursive Tool Inventory</h3>
                    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">LLM autonomously dispatches structured queries to active plugins as required by execution flow.</p>
                    <div className="flex flex-wrap justify-center md:justify-end gap-2 max-w-xs">
                       {['PostgreSQL RAG', 'Order API', 'KnowledgeBase'].map(t => (
                         <span key={t} className="px-2.5 py-1 bg-sky-500/5 border border-sky-500/20 text-sky-600 rounded font-mono text-[11px] font-semibold tracking-tight">{t}</span>
                       ))}
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center order-1 md:order-2 mt-1">
                    <div className="w-14 h-14 rounded-full bg-sky-500/10 border-2 border-sky-500 flex items-center justify-center text-sky-500 shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform z-10 bg-background">
                       <Database className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 hidden md:block order-3" />
                </div>

                {/* STAGE 6: RETURN / REHYDRATION */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 group">
                  <div className="w-full md:w-1/2 hidden md:block order-1" />
                  <div className="relative flex items-center justify-center order-1 md:order-2 mt-1">
                    <div className="w-14 h-14 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform z-10 bg-background">
                       <Activity className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left gap-2 order-2 md:order-3">
                    <h3 className="text-xl font-bold text-foreground group-hover:text-rose-500 transition-colors">Signal Cleaner & Resynthesis</h3>
                    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">Extracts system triggers (like auto-checkout signals), substitutes original PII values, and sanitizes markdown formats.</p>
                    <Badge variant="secondary" className="text-[11px] font-semibold px-2 py-0.5 bg-rose-500/10 text-rose-700 border border-rose-500/10">Safe Payload Restored</Badge>
                  </div>
                </div>

              </div>
            </div>
          </div>
          
          {/* NEW INTERACTIVE UML DIAGRAM TOGGLE */}
          <ProtocolDiagram />
        </div>

        {/* PERFORMANCE & STATS METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           
           {/* Tech Figure 1 - Dynamic Telemetry */}
           <PerformanceTable />


           {/* Tech Figure 2 */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-lg">Data Governance</h3>
              </div>
              <div className="p-5 bg-secondary/20 border border-border rounded-2xl font-mono text-[11px] leading-relaxed relative group overflow-hidden">
                 <div className="absolute top-2 right-2 text-[9px] uppercase tracking-widest opacity-40">Input Scrub Loop</div>
                 <span className="text-muted-foreground">// Incoming user payload</span><br/>
                 <span className="text-foreground">message: </span>
                 <span className="text-red-400">&quot;Email is john@me.com&quot;</span><br/>
                 <br/>
                 <span className="text-green-400 opacity-70">// Transformed payload for LLM</span><br/>
                 <span className="text-foreground">message: </span>
                 <span className="text-blue-400">&quot;Email is [EMAIL_TOKEN_A1]&quot;</span><br/>
                 <br/>
                 <span className="text-green-500 font-bold">Status: SAFE_TO_EGRESS</span>
              </div>
           </div>

           {/* Tech Figure 3 */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-500">
                <Network className="w-5 h-5" />
                <h3 className="font-bold text-lg">Infrastructure Stack</h3>
              </div>
              <div className="space-y-2">
                 {[
                   { name: "API Orchestration", val: "FastAPI (Python)" },
                   { name: "LLM Backbone", val: "Google Gemini 1.5 Stack" },
                   { name: "Cloud Hosting", val: "AWS EC2 / Docker Compose" },
                   { name: "Relational Persistence", val: "Supabase PostgreSQL" },
                 ].map((item) => (
                   <div key={item.name} className="flex justify-between items-center p-3 bg-background border border-border/50 rounded-xl shadow-sm">
                     <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
                     <span className="text-xs font-bold">{item.val}</span>
                   </div>
                 ))}
              </div>
           </div>

        </div>

      </div>
    </div>
  );
}
