"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Search, 
  Package, 
  XCircle, 
  MessageSquare, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Clock,
  Zap
} from "lucide-react";
import Link from "next/link";

const supportFeatures = [
  {
    title: "Track Your Orders",
    description: "Simply ask 'Where is my order?' or provide your order ID to get real-time tracking updates with map visualization.",
    icon: Package,
    color: "bg-blue-500/10 text-blue-500",
    example: "Where is my order #8301bd8d?",
  },
  {
    title: "Cancel Order",
    description: "Need to change your mind? Ask our AI to cancel an order that hasn't shipped yet. It's instant and hassle-free.",
    icon: XCircle,
    color: "bg-red-500/10 text-red-500",
    example: "I want to cancel my last order",
  },
  {
    title: "Product Finder",
    description: "Not sure what you're looking for? Describe your needs, like 'I need a laptop for video editing', and get curated suggestions.",
    icon: Search,
    color: "bg-purple-500/10 text-purple-500",
    example: "Show me some high-end laptops for gaming",
  },
  {
    title: "Policy Questions",
    description: "Get immediate answers about shipping, returns, and warranty policies without searching through pages of text.",
    icon: ShieldCheck,
    color: "bg-green-500/10 text-green-500",
    example: "What is your return policy for electronics?",
  },
  {
    title: "Payment & Billing",
    description: "Ask about payment methods, invoice status, or billing cycles. Our AI handles financial inquiries securely.",
    icon: CreditCard,
    color: "bg-orange-500/10 text-orange-500",
    example: "What payment methods do you accept?",
  },
  {
    title: "Instant Support",
    description: "Available 24/7. No waiting in queues. Our AI is trained to handle complex scenarios and hand over to humans when needed.",
    icon: Clock,
    color: "bg-cyan-500/10 text-cyan-500",
    example: "I have a problem with my delivery",
  }
];

export default function SupportPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-28 bg-secondary/10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="container mx-auto px-4"
        >
          <div className="max-w-3xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">AI Support Assistant</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold font-outfit tracking-tight mb-6"
            >
              How can we <span className="text-primary italic">help you</span> today?
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed"
            >
              Experience the next generation of customer service. Our AI assistant is ready to help you with everything from tracking orders to finding the perfect product.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button 
                onClick={() => {
                  // This is a placeholder for opening the chat
                  const chatButton = document.querySelector('[data-chat-toggle]') as HTMLButtonElement;
                  if (chatButton) chatButton.click();
                }}
                size="lg" 
                className="h-14 px-10 rounded-2xl text-lg font-bold gap-2 shadow-xl shadow-primary/20"
              >
                <MessageSquare className="w-5 h-5" /> Start Chatting
              </Button>
              <Button variant="ghost" size="lg" asChild className="h-14 px-10 rounded-2xl text-lg font-medium">
                <Link href="/shop">Browse Catalog</Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Examples Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-outfit mb-4">Try these examples</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI is versatile and context-aware. Here are some common ways you can interact with it for a seamless experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {supportFeatures.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -10 }}
                className="group p-8 rounded-[2rem] bg-background border border-primary/5 hover:border-primary/20 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 flex flex-col h-full"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold font-outfit mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-8 flex-grow text-sm md:text-base">
                  {feature.description}
                </p>
                <div className="mt-auto">
                  <div className="p-4 rounded-xl bg-secondary/50 border border-primary/5 group-hover:border-primary/20 transition-colors">
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Try saying:
                    </p>
                    <p className="text-sm font-medium italic">"{feature.example}"</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-secondary/20 border-y border-primary/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl md:text-5xl font-bold font-outfit mb-6">Designed for <span className="text-primary italic">Innovation.</span></h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg font-outfit mb-1">Contextual Awareness</h4>
                    <p className="text-muted-foreground text-sm">Our AI remembers your previous messages to provide continuous assistance without repetition.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg font-outfit mb-1">Secure Transactions</h4>
                    <p className="text-muted-foreground text-sm">All order processing and personal data handling are protected by enterprise-grade security.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg font-outfit mb-1">Seamless Transitions</h4>
                    <p className="text-muted-foreground text-sm">If your request needs human intervention, our AI will smoothly hand over the conversation to a specialist.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="relative aspect-square rounded-[3rem] overflow-hidden border border-primary/10 shadow-2xl">
                 {/* This would be a nice image or animation */}
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary flex items-center justify-center">
                    <Sparkles className="w-32 h-32 text-primary/40 animate-pulse" />
                 </div>
                 <div className="absolute bottom-8 left-8 right-8 p-6 rounded-2xl bg-background/80 backdrop-blur-md border border-primary/10">
                    <p className="text-sm font-medium italic mb-2">"Your order is currently in transit and is expected to arrive by 3:00 PM today."</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold">AI</div>
                       <span className="text-xs font-bold font-outfit">Luxe Assistant</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 container mx-auto px-4">
        <div className="rounded-[3rem] bg-primary p-12 md:p-20 text-primary-foreground text-center relative overflow-hidden shadow-2xl shadow-primary/40">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-32 -mt-32" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 blur-[80px] rounded-full -ml-32 -mb-32" />
           
           <h2 className="text-3xl md:text-5xl font-bold font-outfit mb-6 relative z-10">
             Ready to experience the future?
           </h2>
           <p className="text-primary-foreground/80 text-lg mb-10 max-w-xl mx-auto relative z-10">
             Try our AI-powered support now and see how easy it is to manage your orders and explore our collection.
           </p>
           
           <Button 
            onClick={() => {
              const chatButton = document.querySelector('[data-chat-toggle]') as HTMLButtonElement;
              if (chatButton) chatButton.click();
            }}
            size="lg" 
            variant="secondary" 
            className="h-16 px-12 rounded-2xl text-xl font-bold relative z-10 hover:scale-105 transition-transform"
           >
             Open Support Chat
           </Button>
        </div>
      </section>

      {/* Simple Footer Links */}
      <footer className="py-12 border-t border-primary/5">
        <div className="container mx-auto px-4 text-center">
           <p className="text-xs text-muted-foreground uppercase tracking-widest">
             © 2026 LuxeCatalog Support. Powered by Advanced Agentic AI.
           </p>
        </div>
      </footer>
    </div>
  );
}
