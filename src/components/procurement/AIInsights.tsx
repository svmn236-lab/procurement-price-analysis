"use client";
import React from "react";
import { ChevronUp, ChevronDown, Camera, AlertTriangle, CheckCircle2, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIInsightsProps {
  showAiInsights: boolean;
  setShowAiInsights: (show: boolean) => void;
  aiInsights: string;
  handleSectionScreenshot: (ref: HTMLElement | null, name: string) => void;
  aiInsightsRef: React.RefObject<HTMLDivElement>;
  isAnalyzing: boolean;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  showAiInsights,
  setShowAiInsights,
  aiInsights,
  handleSectionScreenshot,
  aiInsightsRef,
  isAnalyzing,
}) => {
  return (
    <section className="bg-slate-900 text-slate-100 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl -mr-32 -mt-32 rounded-full" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 blur-3xl -ml-32 -mb-32 rounded-full" />

      <div
        onClick={() => setShowAiInsights(!showAiInsights)}
        className="w-full text-left flex items-center justify-between relative z-10 group cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <h2 className="text-yellow-400 font-black text-xl flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            AI 談判策略與風險提示
          </h2>
          {aiInsights && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSectionScreenshot(aiInsightsRef.current, 'ai-insights');
              }}
              className="p-2 text-yellow-400/50 hover:text-yellow-400 hover:bg-white/5 rounded-full transition-all relative z-20"
              title="截圖此區塊"
            >
              <Camera size={18} />
            </button>
          )}
        </div>
        <div className="text-yellow-400/50 group-hover:text-yellow-400 transition-colors">
          {showAiInsights ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>
      </div>

      <AnimatePresence>
        {showAiInsights && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-10 overflow-hidden"
          >
            <div className="pt-6" ref={aiInsightsRef}>
              {aiInsights ? (
                <div className="prose prose-invert max-w-none prose-headings:text-yellow-400 prose-strong:text-white prose-p:text-slate-300 text-sm leading-relaxed bg-slate-900 p-4 rounded-xl">
                  <Markdown remarkPlugins={[remarkGfm]}>{aiInsights}</Markdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-4">
                  <BrainCircuit size={48} className="opacity-20" />
                  <p className="text-sm italic">點擊「執行 AI 綜合評估」以獲取深度談判建議...</p>
                </div>
              )}

              {!aiInsights && !isAnalyzing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl">
                    <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} /> 規格異常偵測
                    </h4>
                    <p className="text-slate-400 text-xs italic">
                      當價差超過 20% 時，通常代表廠商對規格理解有誤。請務必確認是否包含運費、版費或特殊加工。
                    </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl">
                    <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                      <CheckCircle2 size={16} /> 議價籌碼建議
                    </h4>
                    <p className="text-slate-400 text-xs italic">
                      利用付款條件（如預付或縮短帳期）爭取 2-5% 的額外折扣。對於大宗採購，物流整合也是關鍵議價點。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
