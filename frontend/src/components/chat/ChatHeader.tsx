"use client";

import { Button } from "@/components/ui/button";
import { Bot, X, Minimize2, Maximize2, Flag } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatHeaderProps {
  isMinimized: boolean;
  onMinimizeToggle: () => void;
  onClose: () => void;
  onComplaintOpen: () => void;
}

export function ChatHeader({ 
  isMinimized, 
  onMinimizeToggle, 
  onClose, 
  onComplaintOpen 
}: ChatHeaderProps) {
  return (
    <div className="relative p-5 bg-primary text-primary-foreground flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-base font-outfit tracking-tight">Luxe Support</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] opacity-90 uppercase tracking-widest font-extrabold">Online Now</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-white/10 text-primary-foreground h-9 w-9 rounded-xl"
              onClick={onComplaintOpen}
            >
              <Flag className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Send Feedback</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-white/10 text-primary-foreground h-9 w-9 rounded-xl"
              onClick={onMinimizeToggle}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isMinimized ? "Maximize" : "Minimize"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-white/10 text-primary-foreground h-9 w-9 rounded-xl"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Close Chat</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
