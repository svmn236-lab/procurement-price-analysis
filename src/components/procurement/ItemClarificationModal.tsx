"use client";
import React, { useRef, useEffect } from "react";
import { X, Send, Bot, User, Loader2, Sparkles, CheckCircle2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ItemClarificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: { role: 'user' | 'ai'; text: string }[];
  onSendMessage: () => void;
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  proposedDescription: string;
  confirmedDescription: string;
  setConfirmedDescription: (val: string) => void;
}

export const ItemClarificationModal: React.FC<ItemClarificationModalProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  input,
  setInput,
  isLoading,
  proposedDescription,
  confirmedDescription,
  setConfirmedDescription,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-100 rounded-xl border border-violet-200">
              <MessageSquare size={24} className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">AI 品項規格釐清</h3>
              <p className="text-xs text-slate-500 mt-0.5">與 AI 討論以產生精確的採購品項描述</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-3 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                msg.role === 'user' ? "bg-slate-100" : "bg-violet-100"
              )}>
                {msg.role === 'user' ? <User size={16} className="text-slate-600" /> : <Bot size={16} className="text-violet-600" />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-slate-800 text-white rounded-tr-none shadow-md" 
                  : "bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm"
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 italic text-xs animate-pulse">
              <Loader2 size={14} className="animate-spin" />
              AI 正在思考您的需求...
            </div>
          )}
        </div>

        {/* Proposed Description Area */}
        <AnimatePresence>
          {proposedDescription && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 py-4 bg-emerald-50 border-t border-emerald-100"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  <Sparkles size={14} /> AI 建議之最終品項描述
                </h4>
                <button
                  onClick={() => setConfirmedDescription(proposedDescription)}
                  className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                >
                  套用此描述
                </button>
              </div>
              <div className="p-3 bg-white/60 rounded-xl border border-emerald-200 text-sm text-emerald-900 font-bold">
                {proposedDescription}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <div className="relative flex items-center gap-3">
            <textarea
              className="flex-1 p-4 pr-12 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-violet-500 outline-none shadow-sm resize-none"
              placeholder="輸入您的需求、用途或規格細節..."
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
            />
            <button
              onClick={onSendMessage}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 p-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white rounded-xl transition-all shadow-lg shadow-violet-200"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-medium italic">
              提示：您可以描述使用場景，讓 AI 幫您補完專業規格描述。
            </p>
            {confirmedDescription && (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-xs font-black rounded-lg hover:bg-emerald-700 transition-all"
              >
                <CheckCircle2 size={14} /> 完成釐清
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
