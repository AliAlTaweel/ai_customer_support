"use client";

import { Bot, User, Loader2, Zap, Cpu, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import TrackingMap from "./TrackingMap";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

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
            <TooltipProvider delay={150}>
              <div className="mt-2 flex flex-wrap gap-2 px-0.5 group cursor-default select-none">
                
                {/* Latency / Fast-Track Badge */}
                <Badge variant="secondary" className="bg-primary/5 text-primary/70 hover:bg-primary/10 transition-all text-[10px] rounded-full px-2 font-outfit flex gap-1 border-primary/10 shadow-none">
                  <Zap className="w-3 h-3" />
                  {message.usage.response_time !== undefined ? `${message.usage.response_time}s` : "Fast-Track"}
                </Badge>

                {/* Token Breakdown Tooltip Badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-muted-foreground hover:bg-secondary/50 transition-all text-[10px] rounded-full px-2 font-outfit flex gap-1.5 cursor-help shadow-none">
                      <Cpu className="w-3 h-3" />
                      {message.usage.total_tokens > 0 ? `${message.usage.total_tokens} Tokens` : "Static Logic"}
                      <Info className="w-2.5 h-2.5 opacity-40 ml-0.5" />
                    </Badge>
                  </TooltipTrigger>
                  {message.usage.total_tokens > 0 && (
                    <TooltipContent side="bottom" className="text-[11px] py-2 bg-popover text-popover-foreground border border-border shadow-lg font-outfit">
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex justify-between opacity-80">
                          <span>Prompt In:</span>
                          <span className="font-bold">{message.usage.prompt_tokens}</span>
                        </div>
                        <div className="flex justify-between opacity-80 border-t border-border/40 pt-1">
                          <span>Response Out:</span>
                          <span className="font-bold">{message.usage.completion_tokens}</span>
                        </div>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </TooltipProvider>
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

