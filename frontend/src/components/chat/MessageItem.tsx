"use client";

import { Bot, User, Loader2, Zap, Cpu } from "lucide-react";
import ReactMarkdown from "react-markdown";
import TrackingMap from "./TrackingMap";

interface Message {
  role: "user" | "assistant";
  content: string;
  tracking_data?: any;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    response_time?: number;
  };
}

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  return (
    <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} mb-4`}>
      <div className={`flex gap-3 max-w-[88%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${message.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
          {message.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>
        <div className={`flex flex-col gap-1.5 ${message.role === "user" ? "items-end" : "items-start"} w-full`}>
          <div className={`p-4 rounded-[1.5rem] text-[0.95rem] leading-[1.6] shadow-sm transition-all duration-300 hover:shadow-md break-words overflow-hidden ${
            message.role === "user" 
              ? "bg-primary text-primary-foreground rounded-tr-none font-sans" 
              : "bg-background border border-primary/5 rounded-tl-none font-outfit text-foreground/90"
          }`}>
            {message.role === "assistant" ? (
              <div className="prose prose-sm dark:prose-invert max-w-full 
                prose-p:leading-relaxed prose-p:my-1 
                prose-strong:text-primary prose-strong:font-bold
                prose-ul:my-2 prose-li:my-0.5
                prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:text-primary
                prose-pre:bg-primary/5 prose-pre:p-3 prose-pre:rounded-xl prose-pre:overflow-x-auto">
                <ReactMarkdown>
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              message.content
            )}
          </div>
          {message.usage && (
            <div className="mt-1.5 px-1">
              <div className="flex items-center gap-2 group cursor-default">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-[9px] font-medium text-primary/60 transition-all hover:bg-primary/10 hover:text-primary">
                  <Zap className="w-2.5 h-2.5" />
                  <span className="font-bold tracking-wide uppercase">
                    {message.usage.response_time ? `${message.usage.response_time}s` : 'Fast-Track'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/30 border border-border text-[9px] font-medium text-muted-foreground transition-all hover:bg-secondary/50">
                  <Cpu className="w-2.5 h-2.5" />
                  <span className="font-medium">
                    {message.usage.total_tokens > 0 ? `${message.usage.total_tokens} tokens` : 'Cached / Logic'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {message.role === "assistant" && message.tracking_data && (
        <div className="mt-3 w-full max-w-[88%] pl-12">
          <TrackingMap data={message.tracking_data} />
        </div>
      )}
    </div>
  );
}

