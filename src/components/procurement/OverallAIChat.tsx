"use client";
import React from "react";
import { BrainCircuit, ChevronUp, ChevronDown, MessageSquare, Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface OverallAIChatProps {
  showOverallChat: boolean;
  setShowOverallChat: (show: boolean) => void;
  overallChatMessages: { role: 'user' | 'model', text: string }[];
  isOverallChatLoading: boolean;
  overallChatInput: string;
  setOverallChatInput: (val: string) => void;
  handleSendOverallChatMessage: () => void;
}

export const OverallAIChat: React.FC<OverallAIChatProps> = ({
  showOverallChat,
  setShowOverallChat,
  overallChatMessages,
  isOverallChatLoading,
  overallChatInput,
  setOverallChatInput,
  handleSendOverallChatMessage,
}) => {
  return (
    <section className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 text-blue-600">
          <BrainCircuit size={24} />
          <h3 className="text-xl font-black text-slate-800">整體採購專家 AI 對話</h3>
        </div>
        <button
          onClick={() => setShowOverallChat(!showOverallChat)}
          className="btn-ghost px-4 py-2"
        >
          {showOverallChat ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showOverallChat ? '收合對話' : '展開對話'}
        </button>
      </div>

      <AnimatePresence>
        {showOverallChat && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col h-[400px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {overallChatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                    <MessageSquare size={48} className="opacity-20" />
                    <p className="text-sm italic">您對本次的成本分析有任何疑問，或是想調整規格嗎？</p>
                  </div>
                ) : (
                  overallChatMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        msg.role === 'user' ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                        msg.role === 'user'
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
                      )}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                        {msg.role === 'user' ? '您' : 'AI 顧問'}
                      </span>
                    </motion.div>
                  ))
                )}
                {isOverallChatLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                    <Loader2 size={14} className="animate-spin" />
                    AI 正在思考中...
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border-t border-slate-200">
                <div className="relative">
                  <input
                    type="text"
                    value={overallChatInput}
                    onChange={(e) => setOverallChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOverallChatMessage()}
                    placeholder="請輸入您的問題或新的規格條件..."
                    className="w-full p-4 pr-16 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    disabled={isOverallChatLoading}
                  />
                  <button
                    onClick={handleSendOverallChatMessage}
                    disabled={isOverallChatLoading || !overallChatInput.trim()}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all",
                      overallChatInput.trim() && !isOverallChatLoading ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-200 text-slate-400"
                    )}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
