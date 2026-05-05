"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Bot, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationState } from "@/lib/ai/types";
import { useUser, useAuth } from "@clerk/nextjs";

import CheckoutForm from "./CheckoutForm";
import TrackingMap from "./TrackingMap";

import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ComplaintModal } from "./ComplaintModal";
import { MessageItem } from "./MessageItem";
import { 
  PendingConfirmation, 
  PendingOrderSummary, 
  PendingYesNo, 
  PendingProductList 
} from "./ActionStates";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, state]);

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
            content: `Hello ${name}! I'm the Luxe Support team. How can I help you today?` 
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
        const errorData = await response.json().catch(() => ({}));
        console.error("Backend Error Response:", {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        
        if (response.status === 429) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: data.message,
        usage: data.usage 
      }]);
      setState(data.state);
    } catch (error: unknown) {
      console.error("Chat error details:", error);
      const errorMessage = (error instanceof Error && error.message === "QUOTA_EXCEEDED") 
        ? "I'm sorry, but I've reached my message limit for now. Please try again in a few minutes."
        : `I'm sorry, I'm having trouble connecting (Error: ${error instanceof Error ? error.message : "Unknown"}). Please try again later.`;
        
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
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            data-chat-toggle
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group"
          >
            <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 group-hover:rotate-12 transition-transform" />
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
              height: isMinimized ? "auto" : "min(600px, calc(100vh - 100px))",
              width: "min(420px, calc(100vw - 2rem))"
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-background border border-primary/10 shadow-2xl rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col mt-4"
          >
            <ChatHeader 
              isMinimized={isMinimized}
              onMinimizeToggle={() => setIsMinimized(!isMinimized)}
              onClose={() => setIsOpen(false)}
              onComplaintOpen={() => setIsComplaintModalOpen(true)}
            />

            {!isMinimized && (
              <div className="flex-1 relative min-h-0 overflow-hidden">
                <ScrollArea className="h-full w-full">
                  <div className="space-y-6 px-5 pt-3 pb-40">
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
                      <MessageItem key={i} message={msg} />
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

                    {state && !isLoading && (
                      <div className="space-y-4">
                        <PendingConfirmation state={state} onSend={handleSend} />
                        <PendingOrderSummary state={state} onSend={handleSend} />
                        <PendingYesNo state={state} onSend={handleSend} />
                        <PendingProductList state={state} onSend={handleSend} />
                        {state.pending_tracking_data && <TrackingMap data={state.pending_tracking_data} />}
                      </div>
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
                    <div ref={messagesEndRef} className="h-px" />
                  </div>
                </ScrollArea>

                <ComplaintModal 
                  isOpen={isComplaintModalOpen}
                  onClose={() => setIsComplaintModalOpen(false)}
                  onSubmit={(text) => handleSend(`I want to send a message to the administration team: ${text}`)}
                />

                <div className="absolute bottom-0 left-0 right-0 z-10">
                  <ChatInput 
                    input={input}
                    setInput={setInput}
                    onSend={handleSend}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}