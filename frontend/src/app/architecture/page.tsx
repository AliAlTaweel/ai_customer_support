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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "System Architecture | LuxeCatalog",
  description: "Deep-dive technical visualization of the autonomous AI pipeline powering LuxeCatalog.",
};

import PerformanceTable from "./PerformanceTable";

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
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
              
              {/* Phase 1: Client */}
              <div className="w-full lg:w-64 flex-shrink-0 space-y-3 text-center lg:text-left">
                <div className="w-12 h-12 mx-auto lg:mx-0 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-sm">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Frontend Gateway</h3>
                  <p className="text-xs text-muted-foreground">Next.js 15 (App Router)</p>
                </div>
                <div className="bg-background border border-border rounded-2xl p-3 text-xs space-y-1 shadow-sm">
                  <div className="flex justify-between"><span className="opacity-60">Runtime</span><span className="font-semibold">Node v18</span></div>
                  <div className="flex justify-between"><span className="opacity-60">State</span><span className="font-semibold">React Context</span></div>
                </div>
              </div>

              {/* Connection 1 */}
              <div className="flex lg:flex-row flex-col items-center text-muted-foreground/30">
                <ArrowDown className="lg:hidden w-6 h-6 animate-pulse" />
                <ArrowRight className="hidden lg:block w-10 h-10 animate-pulse" />
              </div>

              {/* Phase 2: Backend Interceptor Array */}
              <div className="flex-1 w-full bg-background border border-primary/10 rounded-[2rem] p-6 relative shadow-md">
                <div className="absolute top-0 right-0 p-3">
                  <Badge variant="outline" className="text-[10px] border-primary/20 text-primary shadow-none">Python 3.11</Badge>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-teal-500/10 rounded-xl text-teal-500">
                    <Server className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">FastAPI Security Hub</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-secondary/20 border-border/50 shadow-none space-y-2">
                    <div className="flex items-center gap-2 text-green-500">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="font-bold text-xs uppercase tracking-wider">PrivacyScrubber</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Replaces names/phones with deterministic reversible hashes prior to external egress.</p>
                  </Card>

                  <Card className="p-4 bg-secondary/20 border-border/50 shadow-none space-y-2">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Zap className="w-4 h-4" />
                      <span className="font-bold text-xs uppercase tracking-wider">LiteLLM Router</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">Bypasses deep agent chains for mapped strings, yielding &lt;100ms direct latency.</p>
                  </Card>
                </div>
              </div>

              {/* Connection 2 */}
              <div className="flex lg:flex-row flex-col items-center text-muted-foreground/30">
                <ArrowDown className="lg:hidden w-6 h-6 animate-pulse" />
                <ArrowRight className="hidden lg:block w-10 h-10 animate-pulse" />
              </div>

              {/* Phase 3: AI Engine & DB (Stack) */}
              <div className="w-full lg:w-64 space-y-4">
                 <div className="bg-background border border-purple-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase">Gemini Engine</h4>
                      <p className="text-[10px] text-muted-foreground">Google Pro/Flash Stack</p>
                    </div>
                 </div>

                 <div className="bg-background border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase">AWS RDS</h4>
                      <p className="text-[10px] text-muted-foreground">PostgreSQL Cluster</p>
                    </div>
                 </div>
              </div>

            </div>
          </div>
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
                   { name: "Relational Persistence", val: "AWS RDS PostgreSQL" },
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
