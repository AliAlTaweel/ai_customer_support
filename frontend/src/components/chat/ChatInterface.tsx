"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2, Maximize2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationState } from "@/lib/ai/types";
import { useUser, useAuth } from "@clerk/nextjs";

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
  const { getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<ConversationState | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintText, setComplaintText] = useState("");
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
          const token = await getToken();
          const response = await fetch(`${API_URL}/history`, {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });
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
        const token = await getToken();
        try {
          const response = await fetch(`${API_URL}/chat/greet`, { 
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              first_name: user?.firstName || "there",
              user_id: user?.id,
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

  const handleSend = async (overrideMsg?: string) => {
    const userMsg = overrideMsg || input.trim();
    if (!userMsg || isLoading) return;

    if (!overrideMsg) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    const token = await getToken();
    try {
      const response = await fetch(`${API_URL}/chat/chat`, { 
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMsg,
          history: messages,
          state: state,
          user_name: user?.firstName || "Guest",
          user_id: user?.id,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: data.message,
        usage: data.usage 
      }]);
      setState(data.state);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = error.message === "QUOTA_EXCEEDED" 
        ? "I'm sorry, but I've reached my message limit for now. Please try again in a few minutes."
        : "I'm sorry, I'm having trouble connecting right now. Please try again later.";
        
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
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
            <div className="relative p-4 bg-primary text-primary-foreground flex items-center justify-between">
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
                  className="hover:bg-white/10 text-primary-foreground"
                  title="Contact Support/Admin"
                  onClick={() => setIsComplaintModalOpen(true)}
                >
                  <Flag className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-white/10 text-primary-foreground"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-white/10 text-primary-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <div className="flex-1 flex flex-col relative overflow-hidden">
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

                  {state?.pending_confirmation && !isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-3 p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10 mx-2 mb-2"
                    >
                      <div className="flex items-center gap-2 text-primary">
                        <Bot className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Confirm Action</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Would you like to proceed with the cancellation for order <strong>{state.pending_confirmation}</strong>?
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 rounded-xl h-10 font-bold"
                          onClick={() => handleSend("yes")}
                        >
                          Yes, Cancel Order
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl h-10 font-bold bg-background"
                          onClick={() => handleSend("no")}
                        >
                          Nevermind
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {state?.pending_order_summary && !isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-3 p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10 mx-2 mb-2"
                    >
                      <div className="flex items-center gap-2 text-primary">
                        <Bot className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Confirm Order</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {state.pending_order_summary}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 rounded-xl h-10 font-bold"
                          onClick={() => handleSend("yes")}
                        >
                          Yes, Place Order
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl h-10 font-bold bg-background"
                          onClick={() => handleSend("no")}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Complaint Overlay */}
                <AnimatePresence>
                  {isComplaintModalOpen && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute inset-0 bg-background/60 backdrop-blur-md z-30 p-6 flex flex-col items-center justify-center text-center"
                    >
                      <motion.div 
                        initial={{ y: 20 }}
                        animate={{ y: 0 }}
                        className="bg-background border border-primary/20 p-6 rounded-[2rem] shadow-2xl w-full max-w-[320px] space-y-4"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
                          <Flag className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                          <h4 className="font-bold font-outfit text-lg text-foreground">Send Feedback</h4>
                          <p className="text-xs text-muted-foreground">
                            Please describe your concern or complaint for the administration team.
                          </p>
                        </div>
                        <textarea 
                          value={complaintText}
                          onChange={(e) => setComplaintText(e.target.value)}
                          placeholder="Type your complaint here..."
                          className="w-full h-32 bg-secondary/30 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-primary/10 resize-none text-foreground"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 rounded-xl h-10 font-bold"
                            onClick={() => {
                              setIsComplaintModalOpen(false);
                              setComplaintText("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="default" 
                            className="flex-1 rounded-xl h-10 font-bold"
                            disabled={!complaintText.trim()}
                            onClick={() => {
                              handleSend(`I want to send a message to the administration team: ${complaintText}`);
                              setIsComplaintModalOpen(false);
                              setComplaintText("");
                            }}
                          >
                            Submit
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                      onClick={() => handleSend()}
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
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
