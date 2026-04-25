"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationState } from "@/lib/ai/types";
import { useUser } from "@clerk/nextjs";

interface Message {
  role: "user" | "assistant";
  content: string;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export default function ChatInterface() {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<ConversationState | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Fetch chat history from database on mount
  useEffect(() => {
    const fetchHistory = async () => {
      if (user?.firstName) {
        try {
          const response = await fetch(`http://localhost:3001/api/v1/history/${user.firstName}`);
          if (response.ok) {
            const data = await response.json();
            if (data.history && data.history.length > 0) {
              setMessages(data.history);
              setHasGreeted(true); // Don't greet if we have history
            }
          }
        } catch (error) {
          console.error("Failed to fetch history:", error);
        }
      }
    };
    fetchHistory();
  }, [user?.firstName]);

  // Add a dynamic greeting message when the chat opens for the first time
  useEffect(() => {
    const fetchGreeting = async () => {
      if (isOpen && !hasGreeted && messages.length === 0) {
        setHasGreeted(true);
        setIsLoading(true);
        try {
          const response = await fetch("http://localhost:3001/api/v1/chat/greet", { // Updated path to match backend
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              first_name: user?.firstName || "there",
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setMessages([{ 
              role: "assistant", 
              content: data.message,
              usage: data.usage
            }]);
          } else {
            throw new Error("Failed to fetch greeting");
          }
        } catch (error) {
          console.error("Greeting error:", error);
          const name = user?.firstName || "there";
          setMessages([{ 
            role: "assistant", 
            content: `Hello ${name}! I'm the Luxe Assistant team. How can I help you today?` 
          }]);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchGreeting();
  }, [isOpen, hasGreeted, user?.firstName, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/v1/chat/chat", { // Updated path to match backend
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages,
          state: state,
          user_name: user?.firstName || "Guest",
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: data.message,
        usage: data.usage 
      }]);
      setState(data.state);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm sorry, I'm having trouble connecting right now. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group"
          >
            <MessageCircle className="w-8 h-8 group-hover:rotate-12 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? "auto" : "550px",
              width: "400px"
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-background border border-primary/10 shadow-2xl rounded-[2rem] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-outfit">Luxe Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-white/10 text-white"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-white/10 text-white"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Chat Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/5 scrollbar-hide"
                >
                  {messages.length === 0 && (
                    <div className="text-center py-8 space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
                        <Bot className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="font-bold font-outfit text-lg">How can I help?</h4>
                      <p className="text-sm text-muted-foreground px-8">
                        Ask me about current products, order tracking, or cancellations.
                      </p>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-secondary" : "bg-primary text-primary-foreground"}`}>
                          {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-background border border-primary/5 rounded-tl-none shadow-sm"}`}>
                            {msg.content}
                          </div>
                          {msg.usage && (
                            <div className="flex gap-2 px-1 opacity-50 text-[9px] uppercase tracking-tighter font-bold">
                              <span>Tokens: {msg.usage.total_tokens}</span>
                              <span>(In: {msg.usage.prompt_tokens} | Out: {msg.usage.completion_tokens})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-2 items-center text-muted-foreground">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-bold">Luxe is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-primary/5 bg-background">
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      className="w-full h-12 bg-secondary/30 rounded-2xl pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent group-hover:border-primary/10"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1.5 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-center mt-3 text-muted-foreground uppercase tracking-widest font-medium">
                    Powered by Luxe Intelligence
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
