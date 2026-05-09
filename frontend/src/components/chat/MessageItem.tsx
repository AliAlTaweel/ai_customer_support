"use client";

import { Bot, User, Loader2 } from "lucide-react";
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
            <div className="flex flex-col gap-1 px-2 opacity-40 text-[9px] uppercase tracking-tighter font-bold">
              <div className="flex gap-2">
                <span>Tokens: {message.usage.total_tokens}</span>
                <span className="opacity-50">|</span>
                <span>In: {message.usage.prompt_tokens}</span>
                <span className="opacity-50">|</span>
                <span>Out: {message.usage.completion_tokens}</span>
              </div>
              {message.usage.response_time !== undefined && (
                <div className="text-[8px] opacity-80 flex items-center gap-1">
                  <Loader2 className="w-2 h-2" />
                  <span>Response Time: {message.usage.response_time}s</span>
                </div>
              )}
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

