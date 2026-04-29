"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2, Maximize2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationState } from "@/lib/ai/types";
import { useUser, useAuth } from "@clerk/nextjs";

import ReactMarkdown from "react-markdown";

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
  }, [user?.firstName, getToken, API_URL]);

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
  }, [isOpen, hasGreeted, user?.firstName, user?.id, messages.length, getToken, API_URL]);

  const handleSend = async (overrideMsg?: string) => {
    const userMsg = overrideMsg || input.trim();
    if (!userMsg || isLoading) return;

    if (!overrideMsg) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    
    // Clear any pending confirmation states locally so the UI updates immediately
    setState(prev => prev ? { 
      ...prev, 
      pending_confirmation: undefined, 
      pending_order_summary: undefined 
    } : undefined);
    
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
    } catch (error: unknown) {
      console.error("Chat error:", error);
      const errorMessage = (error instanceof Error && error.message === "QUOTA_EXCEEDED") 
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
              height: isMinimized ? "auto" : "600px",
              width: "420px"
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-background border border-primary/10 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="relative p-5 bg-primary text-primary-foreground flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-outfit tracking-tight">Luxe Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] opacity-90 uppercase tracking-widest font-extrabold">Online Now</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-white/10 text-primary-foreground h-9 w-9 rounded-xl"
                  title="Contact Support/Admin"
                  onClick={() => setIsComplaintModalOpen(true)}
                >
                  <Flag className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-white/10 text-primary-foreground h-9 w-9 rounded-xl"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-white/10 text-primary-foreground h-9 w-9 rounded-xl"
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
                  className="flex-1 overflow-y-auto p-5 space-y-6 bg-secondary/5 scrollbar-hide"
                >
                  {messages.length === 0 && (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 flex items-center justify-center mx-auto shadow-sm">
                        <Bot className="w-10 h-10 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold font-outfit text-xl">How can I help you?</h4>
                        <p className="text-sm text-muted-foreground px-10 leading-relaxed font-outfit">
                          Ask me about current products, order tracking, or cancellations. I&apos;m here to assist you!
                        </p>
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-3 max-w-[88%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
                          {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>
                        <div className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          <div className={`p-4 rounded-[1.5rem] text-[0.95rem] leading-[1.6] shadow-sm transition-all duration-300 hover:shadow-md ${
                            msg.role === "user" 
                              ? "bg-primary text-primary-foreground rounded-tr-none font-sans" 
                              : "bg-background border border-primary/5 rounded-tl-none font-outfit text-foreground/90"
                          }`}>
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none 
                                prose-p:leading-relaxed prose-p:my-1 
                                prose-strong:text-primary prose-strong:font-bold
                                prose-ul:my-2 prose-li:my-0.5
                                prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:text-primary">
                                <ReactMarkdown>
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              msg.content
                            )}
                          </div>
                          {msg.usage && (
                            <div className="flex gap-2 px-2 opacity-40 text-[9px] uppercase tracking-tighter font-bold">
                              <span>Tokens: {msg.usage.total_tokens}</span>
                              <span className="opacity-50">|</span>
                              <span>In: {msg.usage.prompt_tokens}</span>
                              <span className="opacity-50">|</span>
                              <span>Out: {msg.usage.completion_tokens}</span>
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
                <div className="p-5 border-t border-primary/5 bg-background">
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      className="w-full h-13 bg-secondary/30 rounded-2xl pl-5 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent group-hover:border-primary/10 font-outfit"
                    />
                    <button 
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-2 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-primary/20"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[9px] text-center mt-3 text-muted-foreground uppercase tracking-[0.2em] font-bold opacity-60">
                    Luxe Intelligence Engine
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
