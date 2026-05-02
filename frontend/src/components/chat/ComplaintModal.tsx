"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag } from "lucide-react";

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function ComplaintModal({ isOpen, onClose, onSubmit }: ComplaintModalProps) {
  const [complaintText, setComplaintText] = useState("");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          <Textarea 
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
                onClose();
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
                onSubmit(complaintText);
                setComplaintText("");
                onClose();
              }}
            >
              Send Report
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
