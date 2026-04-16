'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Send, MessageCircle, X, Minus, Sparkles, Bot } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useUser } from '@clerk/nextjs';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ChatWidget() {
  const { user, isLoaded } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize with personalized message when user is loaded
  useEffect(() => {
    if (isLoaded && chatHistory.length === 0) {
      const name = user?.firstName || 'there';
      setChatHistory([
        { role: 'assistant', content: `Hello ${name}! I'm your AI Support Assistant. How can I help you today?` }
      ]);
    }
  }, [isLoaded, user, chatHistory.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isLoading) return;

    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg,
          first_name: user?.firstName || null
        }),
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Chat Window */}
      <div
        className={cn(
          "mb-4 w-[380px] origin-bottom-right transition-all duration-300 ease-out sm:w-[400px]",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <Card className="flex h-[500px] flex-col overflow-hidden border-border/50 bg-background/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600/10 to-emerald-600/10 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-600 p-1.5 text-white shadow-lg shadow-blue-500/20">
                  <Bot size={18} />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">AI Support</CardTitle>
                  <CardDescription className="text-[10px] leading-tight">Always online • Local RAG</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-black/5"
                onClick={() => setIsOpen(false)}
              >
                <Minus size={16} />
              </Button>
            </div>
          </CardHeader>
          <Separator className="opacity-50" />
          
          <CardContent 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
          >
            {chatHistory.map((chat, i) => (
              <div
                key={i}
                className={cn(
                  "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                  chat.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all",
                    chat.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-secondary text-secondary-foreground rounded-tl-none border border-border/50"
                  )}
                >
                  {chat.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary flex gap-1 rounded-2xl px-4 py-3 text-xs animate-pulse">
                  <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </CardContent>

          <Separator className="opacity-50" />
          <CardFooter className="p-4 bg-muted/30">
            <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
              <Input
                placeholder="Ask something..."
                className="h-9 border-border/50 bg-background/50 focus-visible:ring-blue-500"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="h-9 w-9 shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10"
                disabled={isLoading || !chatMessage.trim()}
              >
                <Send size={16} />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>

      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 active:scale-95 group",
          isOpen 
            ? "rotate-90 bg-zinc-900 hover:bg-zinc-800" 
            : "bg-blue-600 hover:bg-blue-700"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        )}
      </Button>
    </div>
  );
}
