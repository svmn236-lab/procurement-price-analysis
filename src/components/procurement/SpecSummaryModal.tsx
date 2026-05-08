"use client";
import React from "react";
import { X, AlertTriangle, CheckCircle2, LayoutList, FileText, Sparkles, Edit2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConsolidatedSpec } from "@/types/procurement";
import { cn } from "@/lib/utils";

interface SpecSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  specs: ConsolidatedSpec[];
  onConfirm: () => void;
  isConsolidating: boolean;
  editingIndex: number | null;
  setEditingIndex: (index: number | null) => void;
  editingContent: string;
  setEditingContent: (content: string) => void;
  saveEditing: () => void;
}

export const SpecSummaryModal: React.FC<SpecSummaryModalProps> = ({
  isOpen,
  onClose,
  specs,
  onConfirm,
  isConsolidating,
  editingIndex,
  setEditingIndex,
  editingContent,
  setEditingContent,
  saveEditing,
}) => {
  if (!isOpen) return null;

  const hasContradictions = specs.some(s => s.hasContradiction);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl border border-blue-200">
              <LayoutList size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">規格彙總與矛盾檢測報告</h3>
              <p className="text-xs text-slate-500 mt-0.5">AI 已完成規格提取，請確認是否有衝突或需要修正之處</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {hasContradictions && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-black text-red-800">檢測到規格矛盾！</h4>
                <p className="text-xs text-red-600 mt-1">AI 發現部分規格來源存在不一致，請手動校對並編輯修正，否則將影響後續成本估算準確性。</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {specs.length > 0 ? (
              specs.map((spec, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-5 rounded-2xl border transition-all relative group",
                    spec.hasContradiction
                      ? "bg-red-50/30 border-red-200"
                      : "bg-slate-50/30 border-slate-200 hover:border-blue-300 hover:bg-white"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-black tracking-widest uppercase">
                          {spec.category}
                        </span>
                        {spec.hasContradiction && (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-black flex items-center gap-1">
                            <AlertTriangle size={10} /> 矛盾衝突
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold ml-auto flex items-center gap-1">
                          <FileText size={10} /> 來源: {spec.source}
                        </span>
                      </div>

                      {editingIndex === index ? (
                        <div className="mt-2 space-y-3">
                          <textarea
                            className="w-full p-3 border border-blue-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={3}
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                            >
                              取消
                            </button>
                            <button
                              onClick={saveEditing}
                              className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Save size={14} /> 儲存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium">
                            {spec.content}
                          </p>
                          {spec.warning && (
                            <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-start gap-2">
                              <Sparkles size={14} className="shrink-0 mt-0.5" />
                              {spec.warning}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {editingIndex !== index && (
                      <button
                        onClick={() => {
                          setEditingIndex(index);
                          setEditingContent(spec.content);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 italic">
                {isConsolidating ? "AI 正在深度解析文件規格中..." : "未檢測到有效規格數據"}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-xs text-slate-400 font-medium">
            提示：您可以點擊右側編輯圖示修正內容。確認後將鎖定規格。
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
            >
              稍後處理
            </button>
            <button
              onClick={onConfirm}
              disabled={isConsolidating || specs.length === 0}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={18} />
              確認全數規格
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
