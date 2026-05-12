"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Terminal, ArrowRight, MessageSquare, Lock, Cpu, Zap, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const protocolSteps = [
  {
    from: "User",
    to: "Frontend",
    message: 'Send: "Where is order 123?"',
    color: "blue",
    delay: 0.1,
  },
  {
    from: "Frontend",
    to: "FastAPI",
    message: "HTTP POST /chat/chat",
    color: "indigo",
    delay: 0.4,
  },
  {
    from: "FastAPI",
    to: "Local Logic",
    message: "FastTrack cache check",
    note: "Miss -> Fallback to Agent",
    color: "amber",
    delay: 0.7,
  },
  {
    from: "FastAPI",
    to: "Local Logic",
    message: "GDPR PrivacyScrubber",
    note: "PII → Hash Token",
    color: "emerald",
    delay: 1.0,
  },
  {
    from: "FastAPI",
    to: "Gemini AI",
    message: "start_chat(scrubbed_msg)",
    color: "purple",
    delay: 1.3,
  },
  {
    from: "Gemini AI",
    to: "FastAPI",
    message: "FunctionCall(get_order_details)",
    color: "purple",
    delay: 1.6,
    dashed: true,
  },
  {
    from: "FastAPI",
    to: "Database",
    message: "SQL Lookup(ORD-123)",
    color: "cyan",
    delay: 1.9,
  },
  {
    from: "Database",
    to: "FastAPI",
    message: "Status: Shipped",
    color: "cyan",
    delay: 2.2,
    dashed: true,
  },
  {
    from: "FastAPI",
    to: "Gemini AI",
    message: "Submit tool response",
    color: "purple",
    delay: 2.5,
  },
  {
    from: "Gemini AI",
    to: "FastAPI",
    message: "Generate Structured JSON",
    note: "+ TRACKING_INFO Signal",
    color: "purple",
    delay: 2.8,
    dashed: true,
  },
  {
    from: "FastAPI",
    to: "Frontend",
    message: "HTTP 200 { result, telemetry }",
    color: "indigo",
    delay: 3.1,
    dashed: true,
  },
  {
    from: "Frontend",
    to: "User",
    message: "Render tracking UI",
    color: "rose",
    delay: 3.4,
    dashed: true,
  },
];

const participants = [
  { id: "User", icon: MessageSquare, color: "text-blue-500" },
  { id: "Frontend", icon: Terminal, color: "text-indigo-500" },
  { id: "FastAPI", icon: Zap, color: "text-emerald-500" },
  { id: "Local Logic", icon: Lock, color: "text-amber-500" },
  { id: "Gemini AI", icon: Cpu, color: "text-purple-500" },
  { id: "Database", icon: Database, color: "text-cyan-500" },
];

export default function ProtocolDiagram() {
  const [isOpen, setIsOpen] = useState(false);
  const [key, setKey] = useState(0);

  const replay = () => setKey(prev => prev + 1);

  return (
    <div className="mt-8 w-full border border-border/50 rounded-[2rem] bg-secondary/20 overflow-hidden backdrop-blur-sm transition-all duration-500">
      {/* Header Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between group hover:bg-secondary/40 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-primary transition-transform duration-500 ${isOpen ? 'rotate-90' : ''}`}>
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Deep-Dive Protocol View</h3>
            <p className="text-sm text-muted-foreground font-medium opacity-75">Inspect underlying data flow sequence in real-time simulation.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="hidden sm:inline-flex font-mono text-[10px] tracking-wider bg-background">LIFECYCLE_UML</Badge>
           {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-6 sm:p-10 bg-background/40 border-t border-border/40 relative">
              {/* Action Row */}
              <div className="absolute top-4 right-6">
                <button onClick={replay} className="text-xs font-bold tracking-wide text-muted-foreground hover:text-foreground flex items-center gap-1.5 border px-2.5 py-1 rounded-full bg-background transition-colors">
                  <Zap className="w-3 h-3" /> REPLAY TRACE
                </button>
              </div>

              {/* Timeline Container */}
              <div key={key} className="relative overflow-x-auto pb-6 pt-4">
                <div className="min-w-[800px] relative">
                  
                  {/* PARTICIPANT HEADERS */}
                  <div className="grid grid-cols-6 gap-4 relative z-10">
                    {participants.map(p => (
                      <div key={p.id} className="flex flex-col items-center space-y-2">
                        <div className={`p-3 rounded-xl border bg-background shadow-sm flex items-center justify-center ${p.color}`}>
                          <p.icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold font-mono uppercase tracking-wider opacity-80">{p.id}</span>
                      </div>
                    ))}
                  </div>

                  {/* LIFELINES */}
                  <div className="absolute inset-0 grid grid-cols-6 gap-4 pt-16 pointer-events-none">
                    {participants.map(p => (
                      <div key={p.id} className="flex justify-center h-full">
                        <div className="w-[2px] h-full bg-gradient-to-b from-border via-border/40 to-transparent dashed-border" style={{ backgroundImage: "linear-gradient(to bottom, #888 30%, rgba(255,255,255,0) 0%)", backgroundPosition: "top", backgroundSize: "2px 8px", backgroundRepeat: "repeat-y", opacity: 0.3 }} />
                      </div>
                    ))}
                  </div>

                  {/* MESSAGE STEPS */}
                  <div className="relative z-10 pt-8 space-y-6">
                    {protocolSteps.map((step, idx) => {
                      const fromIdx = participants.findIndex(p => p.id === step.from);
                      const toIdx = participants.findIndex(p => p.id === step.to);
                      const isLeftToRight = fromIdx < toIdx;
                      
                      // Calculate grid positioning percentages for clean SVGs
                      const fromPct = (fromIdx * (100/6)) + (100/12);
                      const toPct = (toIdx * (100/6)) + (100/12);
                      const widthPct = Math.abs(toPct - fromPct);
                      const leftPct = Math.min(fromPct, toPct);

                      const colorMap: Record<string, string> = {
                        blue: "text-blue-500 stroke-blue-500 fill-blue-500",
                        indigo: "text-indigo-500 stroke-indigo-500 fill-indigo-500",
                        amber: "text-amber-500 stroke-amber-500 fill-amber-500",
                        emerald: "text-emerald-500 stroke-emerald-500 fill-emerald-500",
                        purple: "text-purple-500 stroke-purple-500 fill-purple-500",
                        cyan: "text-cyan-500 stroke-cyan-500 fill-cyan-500",
                        rose: "text-rose-500 stroke-rose-500 fill-rose-500",
                      };

                      const colors = colorMap[step.color] || "text-primary stroke-primary fill-primary";

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: step.delay, duration: 0.4 }}
                          className="relative h-10 w-full flex items-center"
                        >
                          {/* Arrow Line */}
                          <div 
                            className="absolute h-full top-0" 
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          >
                            <div className="relative w-full h-full flex items-center justify-center">
                              
                              {/* Text Label */}
                              <div className={`absolute -top-4 text-[11px] font-mono whitespace-nowrap font-bold px-2 py-0.5 rounded bg-background/80 backdrop-blur-sm border border-border/50 ${colors.split(' ')[0]}`}>
                                {step.message}
                                {step.note && <span className="opacity-50 font-normal ml-1">({step.note})</span>}
                              </div>

                              {/* Animated Path */}
                              <svg className="w-full h-full overflow-visible">
                                <motion.line
                                  x1={isLeftToRight ? "0%" : "100%"}
                                  y1="50%"
                                  x2={isLeftToRight ? "100%" : "0%"}
                                  y2="50%"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeDasharray={step.dashed ? "4 4" : "none"}
                                  className={colors.split(' ')[1]}
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.5, delay: step.delay + 0.2 }}
                                />
                                {/* Arrowhead */}
                                <motion.polygon
                                  points={isLeftToRight ? "0,-4 8,0 0,4" : "0,-4 -8,0 0,4"}
                                  className={colors.split(' ')[2]}
                                  style={{ 
                                    transform: `translate(${isLeftToRight ? '100%' : '0%'}, 50%)` 
                                  }}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: step.delay + 0.6 }}
                                />
                              </svg>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
