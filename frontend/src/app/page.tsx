"use client";

import { useState, useEffect } from "react";
import { 
  ArrowRight, 
  Sparkles, 
  Cpu, 
  Bot, 
  Database, 
  TrendingUp, 
  Layers, 
  Shield, 
  Lock, 
  Zap, 
  Star, 
  Terminal, 
  Activity, 
  Check, 
  ChevronRight, 
  MessageSquare,
  Network,
  Mail
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "[SYSTEM] Starting LuxeAI Support Core...",
    "[SUCCESS] Presidio Privacy Scrubber initialized (GDPR Active)",
    "[SUCCESS] FAISS FAQ Vector Index loaded (144 embeddings)"
  ]);

  // Rotate mockup console logs for interactive premium feel
  useEffect(() => {
    const logPool = [
      "[ROUTING] Query matched RAG heuristic: returning answer in 24ms",
      "[SECURITY] Filtered user PII: [USER_NAME_1] and [EMAIL_1] scrubbed",
      "[DATABASE] Anti-IDOR check passed for Order #392817",
      "[COMPLIANCE] Token mapping restored for downstream client payload",
      "[LLM] Worker Model output generated (249 prompt tokens)",
      "[ROUTING] Dynamic fallback to Manager Model for checkout request",
    ];

    const interval = setInterval(() => {
      const randomLog = logPool[Math.floor(Math.random() * logPool.length)];
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setConsoleLogs((prev) => [...prev.slice(-4), `[${timestamp}] ${randomLog}`]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      setEmail("");
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-background text-foreground selection:bg-primary/20 selection:text-foreground dark:selection:bg-primary/40 dark:selection:text-foreground dark:text-white">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-accent/5 dark:bg-accent/10 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/3 w-[450px] h-[450px] bg-secondary/3 dark:bg-secondary/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* ── HERO SECTION ── */}
      <section className="relative pt-24 pb-16 md:pt-36 md:pb-28 flex flex-col items-center text-center">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Upper Trusted Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 dark:bg-secondary/20 backdrop-blur-md border border-secondary/30 dark:border-secondary/40 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Star className="w-4 h-4 text-secondary fill-secondary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-secondary font-outfit">
              Enterprise AI Support – Trusted by 500+ Companies
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight font-outfit mb-8 leading-tight text-foreground dark:text-foreground dark:text-white animate-in fade-in slide-in-from-bottom-6 duration-700">
            Automate Your <br className="hidden sm:block" />
            Customer Support with{" "}
            <span className="inline-block px-4 py-1.5 rounded-2xl bg-primary/15 dark:bg-primary/30 border border-primary/30 dark:border-primary/50 text-foreground dark:text-foreground dark:text-white font-extrabold shadow-lg shadow-primary/20 dark:shadow-primary/40 animate-pulse relative">
              AI
              <span className="absolute -inset-1 rounded-2xl border border-primary/20 dark:border-primary/40 pointer-events-none" />
            </span>
          </h1>

          {/* Subtext */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Deploy autonomous, context-aware AI agents in seconds. LuxeAI securely handles customer inquiries, refunds, and ticket resolution with GDPR compliance and anti-IDOR protection.
          </p>
          
          {/* Action Tag Badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-border text-sm font-medium hover:border-white/20 transition-colors">
              <Bot className="w-4 h-4 text-primary dark:text-accent" />
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-border text-sm font-medium hover:border-white/20 transition-colors">
              <Zap className="w-4 h-4 text-secondary" />
              <span>Sub-100ms Response</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-border text-sm font-medium hover:border-white/20 transition-colors">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>GDPR Compliant</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-250">
            <Button asChild size="lg" className="rounded-full bg-primary dark:bg-accent text-foreground dark:text-white dark:text-slate-900 hover:bg-primary dark:bg-accent/90 px-8 py-6 text-base font-bold shadow-[0_4px_20px_rgba(142,213,255,0.3)] transition-all transform hover:scale-[1.02]">
              <Link href="/support">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full border-white/20 hover:bg-white/5 hover:border-white/40 px-8 py-6 text-base font-semibold transition-all text-foreground dark:text-white">
              <Link href="/shop">
                Watch Demo <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE MOCKUP CONSOLE CARD ── */}
      <section className="pb-24 container mx-auto px-4 max-w-5xl">
        <div className="rounded-3xl border border-border bg-slate-100 dark:bg-slate-900/90 shadow-2xl overflow-hidden relative animate-in fade-in duration-1000 delay-300">
          {/* Header Bar */}
          <div className="bg-card dark:bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs text-muted-foreground ml-2 font-mono uppercase tracking-wider">LuxeAI Console v3.1.2</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground/80 bg-black/30 px-3 py-1.5 rounded-lg border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              <span>AGENT CONNECTED</span>
            </div>
          </div>

          {/* Console Content Panel */}
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-sm">
            {/* Left Column: Live Terminal logs */}
            <div className="md:col-span-2 bg-background dark:bg-slate-950 rounded-2xl border border-border p-5 flex flex-col gap-3 min-h-[220px]">
              <div className="flex items-center justify-between text-xs text-primary dark:text-accent border-b border-border pb-2">
                <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5" /> LIVE PIPELINE LOGS</span>
                <span>UTC</span>
              </div>
              <div className="flex-1 flex flex-col gap-2 font-mono text-xs leading-relaxed text-slate-300 overflow-hidden">
                {consoleLogs.map((log, index) => (
                  <div key={index} className="transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-muted-foreground">{log.substring(0, 10)}</span>
                    <span className={log.includes("[SUCCESS]") ? "text-green-400 font-bold" : log.includes("[SECURITY]") ? "text-amber-400 font-bold" : "text-foreground dark:text-white"}>
                      {log.substring(10)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Status Summary Widgets */}
            <div className="flex flex-col gap-4">
              <div className="bg-background dark:bg-slate-950 rounded-2xl border border-border p-4 flex flex-col justify-between h-full">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">LATENCY PROJECTION</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-primary dark:text-accent font-outfit font-sans tracking-tight">42ms</span>
                  <span className="text-xs text-green-400 font-bold">OPTIMAL</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-primary dark:bg-accent rounded-full w-[85%] animate-pulse" />
                </div>
              </div>

              <div className="bg-background dark:bg-slate-950 rounded-2xl border border-border p-4 flex flex-col justify-between h-full">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">PII DATA SCRUBBED</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-secondary font-outfit font-sans tracking-tight">100%</span>
                  <span className="text-xs text-secondary font-bold">SECURED</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-secondary rounded-full w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* System Status Banner */}
          <div className="bg-background dark:bg-slate-950 px-6 py-4 flex items-center justify-between border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary dark:bg-accent/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary dark:text-accent" />
              </div>
              <span className="text-xs font-semibold text-foreground dark:text-white font-outfit uppercase tracking-widest">
                SYSTEM STATUS: AI Agent Online & Processing
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES GRID ── */}
      <section id="features" className="py-20 border-t border-border bg-slate-100 dark:bg-slate-900/40 relative">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-outfit text-foreground dark:text-white tracking-tight mb-4">
              Enterprise-Grade Intelligence
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg">
              Everything you need to scale support without scaling headcount.
            </p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Card: Tall Card spans 2 rows */}
            <div className="md:col-span-2 md:row-span-2 rounded-3xl border border-border bg-card dark:bg-slate-900/60 backdrop-blur-md p-8 flex flex-col justify-between relative overflow-hidden group hover:border-primary/20 dark:hover:border-accent/20 transition-all duration-500">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary dark:bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary dark:bg-accent/10 flex items-center justify-center mb-6 text-primary dark:text-accent">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold font-outfit text-foreground dark:text-white mb-3">Autonomous AI Agent</h3>
                <p className="text-muted-foreground leading-relaxed text-sm max-w-md mb-8">
                  Resolves up to 80% of Tier 1 tickets instantly using deep context and natural language processing.
                </p>
              </div>

              {/* Chat Simulation Preview mockup */}
              <div className="bg-background dark:bg-slate-950 rounded-2xl border border-border p-5 flex flex-col gap-4 shadow-2xl relative">
                {/* Simulated message 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-foreground dark:text-white shrink-0 mt-0.5">U</div>
                  <div className="bg-white/5 rounded-2xl px-4 py-2 text-xs text-slate-300 max-w-[80%] border border-border">
                    I need help resetting my API key.
                  </div>
                </div>

                {/* Simulated message 2 */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-primary dark:bg-primary/10 border border-primary/20 dark:border-primary/40 rounded-2xl px-4 py-2 text-xs text-foreground dark:text-slate-200 max-w-[80%] text-right order-1">
                    I can help with that. First, navigate to your Dashboard &gt; Settings &gt; Developer.
                  </div>
                  <div className="w-7 h-7 rounded-full bg-primary dark:bg-accent/20 flex items-center justify-center shrink-0 mt-0.5 order-2">
                    <Bot className="w-4 h-4 text-primary dark:text-accent" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card Top: Dynamic Knowledge Base */}
            <div className="rounded-3xl border border-border bg-card dark:bg-slate-900/60 backdrop-blur-md p-8 flex flex-col justify-between group hover:border-primary/20 dark:hover:border-accent/20 transition-all duration-500">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center mb-6 text-secondary">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-outfit text-foreground dark:text-white mb-3">Dynamic Knowledge Base</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Syncs continuously with your documentation, Notion, and Zendesk articles.
                </p>
              </div>
            </div>

            {/* Right Card Bottom: Sentiment Analytics */}
            <div className="rounded-3xl border border-border bg-card dark:bg-slate-900/60 backdrop-blur-md p-8 flex flex-col justify-between group hover:border-primary/20 dark:hover:border-accent/20 transition-all duration-500">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 flex items-center justify-center mb-6 text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-outfit text-foreground dark:text-white mb-3">Sentiment Analytics</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Track resolution rates, CSAT, and agent handoffs in real-time.
                </p>
              </div>
            </div>

            {/* Full-Width Bottom Card: Secure Multi-Tenant Architecture */}
            <div className="md:col-span-3 rounded-3xl border border-border bg-card dark:bg-slate-900/60 backdrop-blur-md p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-primary/20 dark:hover:border-accent/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/3 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex gap-4 items-start md:items-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Network className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-outfit text-foreground dark:text-white mb-2">Secure Multi-Tenant Architecture</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm max-w-xl">
                    Isolated data environments for enterprise compliance and strict GDPR adherence across all workspaces.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">GDPR COMPLIANT</span>
                <span className="text-[10px] uppercase font-mono tracking-widest bg-primary dark:bg-primary/10 text-primary dark:text-accent border border-primary/20 dark:border-primary/40 px-3 py-1 rounded-full font-bold">SQL SHIELD</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS SECTION ── */}
      <section className="py-20 border-b border-border bg-background dark:bg-slate-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 text-center">
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary dark:text-accent font-outfit">80%</div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground/80 font-bold">RESOLUTION RATE</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-secondary font-outfit">&lt;100ms</div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground/80 font-bold">RESPONSE TIME</div>
            </div>

            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground dark:text-white font-outfit">500+</div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground/80 font-bold">ENTERPRISE CLIENTS</div>
            </div>

            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight text-emerald-400 font-outfit">99.9%</div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground/80 font-bold">UPTIME SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL-TO-ACTION NEWSLETTER SECTION ── */}
      <section className="py-24 container mx-auto px-4 max-w-5xl">
        <div className="rounded-[2.5rem] bg-gradient-to-b from-[#14181a] to-[#0b0f10] p-10 md:p-20 text-center relative overflow-hidden border border-border shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary dark:bg-primary/5 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary dark:bg-accent/3 blur-[80px] rounded-full -ml-32 -mb-32 pointer-events-none" />
          
          <h2 className="text-3xl md:text-5xl font-extrabold font-outfit mb-6 text-foreground dark:text-white tracking-tight">
            Ready to upgrade your support?
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mb-10 max-w-lg mx-auto leading-relaxed">
            Join thousands of high-performance teams using LuxeAI to deliver perfect customer experiences.
          </p>
          
          {!isSubmitted ? (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <div className="relative w-full">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email" 
                  required
                  disabled={loading}
                  className="h-13 pl-11 pr-5 rounded-xl bg-background dark:bg-slate-950/80 border border-border text-foreground dark:text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#8ed5ff]/45 w-full backdrop-blur-md font-sans text-sm"
                />
              </div>
              <Button type="submit" disabled={loading} className="h-13 px-8 rounded-xl text-sm font-bold bg-primary dark:bg-accent text-foreground dark:text-white dark:text-slate-900 hover:bg-primary dark:bg-accent/90 w-full sm:w-auto shadow-lg shadow-[#8ed5ff]/10 shrink-0">
                {loading ? "Joining..." : "Get Access"}
              </Button>
            </form>
          ) : (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl max-w-sm mx-auto flex items-center justify-center gap-2 animate-in zoom-in-95 duration-300">
              <Check className="w-5 h-5" />
              <span className="font-semibold text-sm">Access granted! Check your inbox.</span>
            </div>
          )}
        </div>
      </section>

      {/* ── LANDING FOOTER ── */}
      <footer className="py-16 border-t border-border bg-background dark:bg-slate-950/95 relative z-10 font-sans">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary dark:bg-primary flex items-center justify-center">
                <span className="text-foreground dark:text-white font-extrabold text-base font-outfit">L</span>
              </div>
              <span className="text-lg font-bold font-outfit tracking-tight text-foreground dark:text-white">LuxeAI</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Executive-grade AI support automation for modern enterprises. Built to resolve queries dynamically and securely.
            </p>
          </div>
          
          <div>
            <h5 className="font-bold mb-5 font-outfit uppercase text-xs tracking-widest text-primary dark:text-accent">Product</h5>
            <ul className="space-y-3.5 text-xs text-muted-foreground">
              <li><Link href="/#features" className="hover:text-foreground dark:text-white transition-colors">Features</Link></li>
              <li><Link href="/architecture" className="hover:text-foreground dark:text-white transition-colors">API & Specs</Link></li>
              <li><span className="text-primary dark:text-accent bg-primary dark:bg-accent/10 border border-primary/20 dark:border-accent/20 px-2 py-0.5 rounded text-[10px] font-bold">SYSTEM STATUS: OK</span></li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-bold mb-5 font-outfit uppercase text-xs tracking-widest text-primary dark:text-accent">Legal</h5>
            <ul className="space-y-3.5 text-xs text-muted-foreground">
              <li><a href="#" className="hover:text-foreground dark:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground dark:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="container mx-auto px-4 max-w-5xl mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-widest">
          <p>© 2026 LuxeAI Premium B2B. All rights reserved.</p>
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-foreground dark:text-white">Twitter</a>
            <a href="#" className="hover:text-foreground dark:text-white">GitHub</a>
            <a href="#" className="hover:text-foreground dark:text-white">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
