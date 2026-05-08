"use client";
import React from "react";
import { TrendingDown, DollarSign, Sparkles, RefreshCw, GitCompare, ChevronUp, ChevronDown, MessageSquare, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CostItem, CostHistoryEntry } from "@/types/procurement";

interface Phase1ResultsProps {
  aiEstimatedPrice: number | null;
  totalQty: number | '';
  quoteTimeframe: string;
  runAiAnalysis: () => void;
  isAnalyzing: boolean;
  setShowDiffModal: (show: boolean) => void;
  costHistory: CostHistoryEntry[];
  showBreakdown: boolean;
  setShowBreakdown: (show: boolean) => void;
  costBreakdown: CostItem[];
  handleOpenChat: (item: CostItem) => void;
}

export const Phase1Results: React.FC<Phase1ResultsProps> = ({
  aiEstimatedPrice,
  totalQty,
  quoteTimeframe,
  runAiAnalysis,
  isAnalyzing,
  setShowDiffModal,
  costHistory,
  showBreakdown,
  setShowBreakdown,
  costBreakdown,
  handleOpenChat,
}) => {
  if (aiEstimatedPrice === null) return null;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border-b-4 border-green-500"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingDown size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">AI 估算單價</span>
          </div>
          <p className="text-3xl font-black text-green-600">
            ${aiEstimatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-md border-b-4 border-blue-500"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">AI 估算總價 (預計總預算)</span>
          </div>
          <p className="text-3xl font-black text-blue-600">
            ${(aiEstimatedPrice * (Number(totalQty) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </motion.div>
      </div>

      {/* AI Cost Breakdown Section */}
      <section className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-amber-600 flex-wrap">
            <Sparkles size={24} />
            <h3 className="text-xl font-black text-slate-800">AI 詳細成本分項</h3>
            {quoteTimeframe && (
              <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200">
                模擬報價區間：{quoteTimeframe}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAiAnalysis}
              disabled={isAnalyzing}
              className="flex items-center justify-center p-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50"
              title="重新進行 AI 成本估算"
            >
              <RefreshCw size={16} className={isAnalyzing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowDiffModal(true)}
              disabled={costHistory.length < 2}
              className="flex items-center justify-center p-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50"
              title="差異分析"
            >
              <GitCompare size={16} />
            </button>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100 transition-all"
            >
              {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showBreakdown ? '收合成本拆解' : '展開成本拆解'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showBreakdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="overflow-x-auto rounded-xl border border-slate-100 mt-4">
                <table className="table-cost-summary">
                  <thead>
                    <tr>
                      <th className="table-th">分類</th>
                      <th className="table-th">項目</th>
                      <th className="table-th">預估成本</th>
                      <th className="table-th">計算基礎</th>
                      <th className="table-th">計算說明</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {costBreakdown.length > 0 ? (
                      costBreakdown.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-black border border-slate-200">
                              {item.category || '未分類'}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-700">{item.item}</td>
                          <td className="p-4 font-mono text-amber-600">
                            {item.isUpdating ? (
                              <Loader2 size={16} className="animate-spin text-amber-500" />
                            ) : (
                              `$${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            )}
                          </td>
                          <td className="p-4 text-slate-500">
                            <div className="flex items-center justify-between gap-2">
                              <span>{item.basis}</span>
                              <button
                                onClick={() => handleOpenChat(item)}
                                className="p-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex-shrink-0"
                                title="詳細說明與 AI 對話"
                              >
                                <MessageSquare size={14} />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-slate-400 text-xs leading-relaxed">{item.explanation}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                          暫無詳細成本數據
                        </td>
                      </tr>
                    )}
                    {costBreakdown.length > 0 && (
                      <tr className="bg-amber-100 font-black text-lg border-t-2 border-amber-200">
                        <td className="p-4 text-amber-900" colSpan={2}>總計</td>
                        <td className="p-4 text-red-600 text-2xl">${aiEstimatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td colSpan={2} className="p-4 text-amber-700 text-sm">AI 估算總價</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};
