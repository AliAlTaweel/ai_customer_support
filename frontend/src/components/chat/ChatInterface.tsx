"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2, Maximize2, Flag, CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationState } from "@/lib/ai/types";
import { useUser, useAuth } from "@clerk/nextjs";

import ReactMarkdown from "react-markdown";
import CheckoutForm from "./CheckoutForm";
import TrackingMap from "./TrackingMap";

interface Message {
  role: "user" | "assistant";
  content: string;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    response_time?: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export default function ChatInterface() {
  const { user } = useUser();
  const { getToken } = useAuth();
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
  }, [user?.firstName, getToken]);

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
  }, [isOpen, hasGreeted, user?.firstName, user?.id, messages.length, getToken]);

  const handleSend = async (overrideMsg?: string) => {
    const userMsg = overrideMsg || input.trim();
    if (!userMsg || isLoading) return;

    if (!overrideMsg) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    
    // Clear any pending confirmation states locally so the UI updates immediately
    setState(prev => prev ? { 
      ...prev, 
      pending_confirmation: undefined, 
      pending_order_summary: undefined,
      pending_checkout: undefined,
      pending_yes_no: undefined,
      pending_product_list: undefined,
      pending_tracking_data: undefined
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

  const handleCheckout = async (details: any) => {
    setIsLoading(true);
    // Clear the checkout state immediately so the form closes
    setState(prev => prev ? { ...prev, pending_checkout: null } : undefined);
    const token = await getToken();
    try {
      const response = await fetch(`${API_URL}/chat/chat`, { 
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: "SYSTEM_PROCESS_ORDER",
          history: messages,
          state: { ...state, pending_order_details: details },
          user_name: user?.firstName || "Guest",
          user_id: user?.id,
        }),
      });

      if (!response.ok) throw new Error("Order placement failed");

      const data = await response.json();
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: data.message,
        usage: data.usage 
      }]);
      setState(data.state);
    } catch (error) {
      console.error("Checkout error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm sorry, I encountered an error while processing your order. Please try again." },
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
            data-chat-toggle
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
                  className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-6 bg-secondary/5 scrollbar-hide"
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
                          <div className={`p-4 rounded-[1.5rem] text-[0.95rem] leading-[1.6] shadow-sm transition-all duration-300 hover:shadow-md break-words overflow-hidden ${
                            msg.role === "user" 
                              ? "bg-primary text-primary-foreground rounded-tr-none font-sans" 
                              : "bg-background border border-primary/5 rounded-tl-none font-outfit text-foreground/90"
                          }`}>
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-full 
                                prose-p:leading-relaxed prose-p:my-1 
                                prose-strong:text-primary prose-strong:font-bold
                                prose-ul:my-2 prose-li:my-0.5
                                prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:text-primary
                                prose-pre:bg-primary/5 prose-pre:p-3 prose-pre:rounded-xl prose-pre:overflow-x-auto">
                                <ReactMarkdown>
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              msg.content
                            )}
                          </div>
                          {msg.usage && (
                            <div className="flex flex-col gap-1 px-2 opacity-40 text-[9px] uppercase tracking-tighter font-bold">
                              <div className="flex gap-2">
                                <span>Tokens: {msg.usage.total_tokens}</span>
                                <span className="opacity-50">|</span>
                                <span>In: {msg.usage.prompt_tokens}</span>
                                <span className="opacity-50">|</span>
                                <span>Out: {msg.usage.completion_tokens}</span>
                              </div>
                              {msg.usage.response_time !== undefined && (
                                <div className="text-[8px] opacity-80 flex items-center gap-1">
                                  <Loader2 className="w-2 h-2" />
                                  <span>Response Time: {msg.usage.response_time}s</span>
                                </div>
                              )}
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
                      className="flex flex-col gap-3 p-4 bg-secondary/20 rounded-2xl border border-primary/10 mx-1 mb-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-primary">
                        <Bot className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Action Required</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Would you like to cancel order <strong>{state.pending_confirmation}</strong>?
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 rounded-xl h-9 text-xs font-bold shadow-md shadow-primary/10"
                          onClick={() => handleSend("yes")}
                        >
                          Confirm
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl h-9 text-xs font-bold bg-background border-primary/5 hover:bg-primary/5"
                          onClick={() => handleSend("no")}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {state?.pending_order_summary && !isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col gap-3.5 p-4 bg-secondary/10 rounded-[2rem] border border-primary/10 mx-1 mb-3 shadow-lg backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 text-primary">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]">Purchase Details</span>
                      </div>
                      
                      {typeof state.pending_order_summary === 'string' ? (
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {state.pending_order_summary}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            {state.pending_order_summary.imageUrl && (
                              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white border border-primary/5 shadow-sm">
                                <img 
                                  src={state.pending_order_summary.imageUrl} 
                                  alt={state.pending_order_summary.product_name} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                              <h4 className="font-bold text-[15px] leading-tight text-foreground/90 font-outfit truncate">
                                {state.pending_order_summary.product_name || state.pending_order_summary.name || "Product"}
                              </h4>
                              <p className="text-lg font-black text-primary font-sans">
                                ${(Number(state.pending_order_summary.price || state.pending_order_summary.amount) || 0).toFixed(2)}
                              </p>
                              {state.pending_order_summary.estimated_delivery && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Clock className="w-3 h-3 text-green-500" />
                                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight">
                                    {state.pending_order_summary.estimated_delivery}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {state.pending_order_summary.details && (
                            <div className="bg-background/50 rounded-xl p-3 border border-primary/5">
                              <p className="text-[11px] text-muted-foreground leading-normal font-outfit line-clamp-2">
                                {state.pending_order_summary.details}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2.5 mt-1">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 rounded-xl h-10 font-bold shadow-md shadow-primary/10"
                          onClick={() => handleSend("yes")}
                        >
                          Checkout
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl h-10 font-bold bg-background border-primary/5"
                          onClick={() => handleSend("no")}
                        >
                          Maybe Later
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {state?.pending_yes_no && !isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col gap-3 p-4 bg-secondary/10 rounded-2xl border border-primary/10 mx-1 mb-3 shadow-md"
                    >
                      <div className="flex items-center gap-2 text-primary">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Confirmation</span>
                      </div>
                      <p className="text-xs font-medium text-foreground/80 leading-relaxed font-outfit break-words">
                        {state.pending_yes_no}
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 rounded-xl h-9 text-xs font-bold"
                          onClick={() => handleSend("yes")}
                        >
                          Confirm
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl h-9 text-xs font-bold bg-background"
                          onClick={() => handleSend("no")}
                        >
                          Not Now
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {state?.pending_product_list && !isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3 mb-4"
                    >
                      <div className="flex items-center gap-2 px-2 text-primary">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Recommended Products</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 snap-x scrollbar-hide -mx-1">
                        {state.pending_product_list.map((product) => (
                          <motion.div 
                            key={product.id}
                            whileHover={{ y: -4 }}
                            className="flex-shrink-0 w-[240px] snap-start bg-background border border-primary/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                          >
                            <div className="h-32 bg-secondary/20 relative group">
                              {product.imageUrl ? (
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-8 h-8 text-primary/20" />
                                </div>
                              )}
                              <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm border border-primary/5">
                                <span className="text-sm font-black text-primary">${product.price}</span>
                              </div>
                            </div>
                            <div className="p-4 space-y-3">
                              <div className="space-y-1">
                                <h4 className="font-bold text-[14px] leading-tight text-foreground/90 font-outfit line-clamp-1">
                                  {product.name}
                                </h4>
                                <p className="text-[11px] text-muted-foreground line-clamp-2 font-outfit leading-normal h-8">
                                  {product.description || "Premium Luxe product quality guaranteed."}
                                </p>
                              </div>
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="w-full rounded-xl h-9 font-bold text-xs shadow-md shadow-primary/5 group/btn"
                                onClick={() => handleSend(`I want to buy the ${product.name}`)}
                              >
                                Select Product
                                <Send className="w-3 h-3 ml-2 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {state?.pending_tracking_data && !isLoading && (
                    <TrackingMap data={state.pending_tracking_data} />
                  )}

                  <AnimatePresence>
                    {state?.pending_checkout && (
                      <CheckoutForm 
                        key="checkout-form-overlay"
                        items={state.pending_checkout.items || []}
                        onSubmit={handleCheckout}
                        initialEmail={user?.emailAddresses[0]?.emailAddress}
                        onCancel={() => {
                          setState(prev => prev ? { ...prev, pending_checkout: null } : undefined);
                          handleSend("cancel order");
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Complaint Overlay */}
                <AnimatePresence>
                  {isComplaintModalOpen && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-background/40 backdrop-blur-md z-30 p-4 flex items-center justify-center"
                    >
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="bg-background border border-primary/10 p-5 rounded-[1.5rem] shadow-2xl w-full max-w-[340px] space-y-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <Flag className="w-5 h-5 text-red-500" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-bold font-outfit text-sm">Send Feedback</h4>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              Your message will be sent to our admin team.
                            </p>
                          </div>
                        </div>
                        <textarea 
                          value={complaintText}
                          onChange={(e) => setComplaintText(e.target.value)}
                          placeholder="What can we improve? Describe your issue here..."
                          className="w-full h-28 bg-secondary/30 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/10 border border-primary/5 resize-none text-foreground placeholder:opacity-50"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            className="flex-1 rounded-xl h-10 text-xs font-bold hover:bg-primary/5"
                            onClick={() => {
                              setIsComplaintModalOpen(false);
                              setComplaintText("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="default" 
                            className="flex-1 rounded-xl h-10 text-xs font-bold shadow-lg shadow-primary/10"
                            disabled={!complaintText.trim()}
                            onClick={() => {
                              handleSend(`I want to send a message to the administration team: ${complaintText}`);
                              setIsComplaintModalOpen(false);
                              setComplaintText("");
                            }}
                          >
                            Send Report
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
