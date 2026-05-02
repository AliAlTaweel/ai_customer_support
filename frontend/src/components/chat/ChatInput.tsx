"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export function ChatInput({ input, setInput, onSend, isLoading }: ChatInputProps) {
  return (
    <div className="p-5 border-t border-primary/5 bg-background/80 backdrop-blur-xl">
      <div className="relative group">
        <Input
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          className="w-full h-14 bg-secondary/30 rounded-2xl pl-5 pr-14 text-sm focus-visible:ring-primary/20 transition-all border-transparent group-hover:border-primary/10 font-outfit text-foreground"
        />
        <Button 
          size="icon"
          onClick={() => onSend()}
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-2 w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-primary/20"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-[9px] text-center mt-3 text-muted-foreground uppercase tracking-[0.2em] font-bold opacity-60">
        Luxe Intelligence Engine
      </p>
    </div>
  );
}
