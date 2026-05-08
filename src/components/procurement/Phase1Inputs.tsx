"use client";
import React from "react";
import { Plus, FolderOpen, LayoutList, ChevronUp, ChevronDown, FileText, Trash2, Upload, RefreshCw, Lightbulb, CheckCircle2, Loader2, Sparkles, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { AlternativeProduct } from "@/types/procurement";

interface Phase1InputsProps {
  setShowSavedProjectsModal: (show: boolean) => void;
  showProjectDetails: boolean;
  setShowProjectDetails: (show: boolean) => void;
  docNumber: string;
  setDocNumber: (val: string) => void;
  department: string;
  setDepartment: (val: string) => void;
  section: string;
  setSection: (val: string) => void;
  applicant: string;
  setApplicant: (val: string) => void;
  budgetAmount: number | '';
  setBudgetAmount: (val: number | '') => void;
  handlingSection: string;
  setHandlingSection: (val: string) => void;
  handler: string;
  setHandler: (val: string) => void;
  showProcurementInputs: boolean;
  setShowProcurementInputs: (show: boolean) => void;
  confirmedItemDescription: string;
  fetchAlternatives: () => void;
  isFetchingAlternatives: boolean;
  alternatives: AlternativeProduct[];
  setShowAlternativesModal: (show: boolean) => void;
  setSpecFile: (file: File | null) => void;
  specFile: File | null;
  totalQty: number | '';
  setTotalQty: (val: number | '') => void;
  handleAddSpec: () => void;
  supplementarySpecs: string[];
  handleSpecChange: (index: number, val: string) => void;
  handleRemoveSpec: (index: number) => void;
  quoteTimeframe: string;
  setQuoteTimeframe: (val: string) => void;
  handleConsolidateSpecs: () => void;
  isConsolidating: boolean;
  isSpecsConfirmed: boolean;
  itemName: string;
  setItemName: (name: string) => void;
  handleStartItemClarification: () => void;
  confirmedItemRef: React.RefObject<HTMLDivElement>;
  handleSectionScreenshot: (ref: HTMLElement | null, name: string) => void;
  setConfirmedItemDescription: (desc: string) => void;
  runAiAnalysis: () => void;
  isAnalyzing: boolean;
}

export const Phase1Inputs: React.FC<Phase1InputsProps> = ({
  setShowSavedProjectsModal,
  showProjectDetails,
  setShowProjectDetails,
  docNumber,
  setDocNumber,
  department,
  setDepartment,
  section,
  setSection,
  applicant,
  setApplicant,
  budgetAmount,
  setBudgetAmount,
  handlingSection,
  setHandlingSection,
  handler,
  setHandler,
  showProcurementInputs,
  setShowProcurementInputs,
  confirmedItemDescription,
  fetchAlternatives,
  isFetchingAlternatives,
  alternatives,
  setShowAlternativesModal,
  setSpecFile,
  specFile,
  totalQty,
  setTotalQty,
  handleAddSpec,
  supplementarySpecs,
  handleSpecChange,
  handleRemoveSpec,
  quoteTimeframe,
  setQuoteTimeframe,
  handleConsolidateSpecs,
  isConsolidating,
  isSpecsConfirmed,
  itemName,
  setItemName,
  handleStartItemClarification,
  confirmedItemRef,
  handleSectionScreenshot,
  setConfirmedItemDescription,
  runAiAnalysis,
  isAnalyzing,
}) => {
  return (
    <div className="lg:col-span-4 space-y-6">
      <section className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Plus className="text-brand-primary" /> 購案資訊輸入
          </h2>
          <button
            onClick={() => setShowSavedProjectsModal(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="開啟歷史紀錄"
          >
            <FolderOpen size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="card-base overflow-hidden">
            <button
              onClick={() => setShowProjectDetails(!showProjectDetails)}
              className="card-header-btn"
            >
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <LayoutList size={14} /> 購案詳細資訊 (選填)
              </span>
              {showProjectDetails ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            <AnimatePresence>
              {showProjectDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-white"
                >
                  <div className="p-4 space-y-4 border-t border-slate-100">
                    <div>
                      <label className="label-caps">簽呈單文件編號</label>
                      <input type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-caps">隸屬部門</label>
                        <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="label-caps">隸屬科別</label>
                        <input type="text" value={section} onChange={(e) => setSection(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-caps">申請人</label>
                        <input type="text" value={applicant} onChange={(e) => setApplicant(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="label-caps">預算金額</label>
                        <input type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(Number(e.target.value) || '')} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-caps">承辦科</label>
                        <input type="text" value={handlingSection} onChange={(e) => setHandlingSection(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="label-caps">承辦人</label>
                        <input type="text" value={handler} onChange={(e) => setHandler(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="card-base overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 pr-3">
              <button
                onClick={() => setShowProcurementInputs(!showProcurementInputs)}
                className="flex-1 flex items-center justify-between p-3 hover:bg-slate-100 transition-colors"
              >
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <LayoutList size={14} /> 規格與條件輸入
                </span>
                {showProcurementInputs ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>
              {confirmedItemDescription && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={fetchAlternatives}
                    disabled={isFetchingAlternatives}
                    className="px-2 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-xs font-bold transition-colors"
                    title="重新搜尋替代品"
                  >
                    <RefreshCw size={14} className={isFetchingAlternatives ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={alternatives.length > 0 ? () => setShowAlternativesModal(true) : fetchAlternatives}
                    className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <Lightbulb size={14} /> 推薦替代品
                  </button>
                </div>
              )}
            </div>
            <AnimatePresence>
              {showProcurementInputs && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-white"
                >
                  <div className="p-4 space-y-5 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">上傳發包規格 (PDF/IMG)</label>
                      <div className="relative group">
                        <input
                          type="file"
                          id="spec-upload"
                          className="hidden"
                          onChange={(e) => setSpecFile(e.target.files?.[0] || null)}
                        />
                        <label
                          htmlFor="spec-upload"
                          className={cn(
                            "flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                            specFile
                              ? "border-green-400 bg-green-50 text-green-700"
                              : "border-slate-200 hover:border-red-400 hover:bg-red-50 text-slate-500"
                          )}
                        >
                          {specFile ? (
                            <>
                              <FileText size={18} />
                              <span className="text-sm font-bold truncate max-w-[200px]">{specFile.name}</span>
                              <button
                                onClick={(e) => { e.preventDefault(); setSpecFile(null); }}
                                className="ml-auto text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <Upload size={18} />
                              <span className="text-sm font-bold">點擊或拖拽上傳規格書</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">採購總量</label>
                        <input
                          type="number"
                          value={totalQty}
                          onChange={(e) => setTotalQty(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">補充規格條件</h3>
                        <button
                          onClick={handleAddSpec}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Plus size={20} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <AnimatePresence initial={false}>
                          {supplementarySpecs.map((spec, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="flex gap-2 items-start group"
                            >
                              <div className="mt-2.5 flex-shrink-0 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400">
                                {index + 1}
                              </div>
                              <textarea
                                rows={1}
                                placeholder="輸入補充規格說明..."
                                value={spec}
                                onChange={(e) => handleSpecChange(index, e.target.value)}
                                className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:border-red-500 outline-none resize-none overflow-hidden"
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                              <button
                                onClick={() => handleRemoveSpec(index)}
                                className="opacity-0 group-hover:opacity-100 p-2 mt-1 text-slate-300 hover:text-red-500 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">有效報價時間區間</label>
                        <input
                          type="text"
                          placeholder="例如：2026/04/01 - 2026/04/30 或 2026年Q2"
                          value={quoteTimeframe}
                          onChange={(e) => setQuoteTimeframe(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:border-red-500 outline-none transition-all"
                        />
                      </div>

                      <button
                        onClick={handleConsolidateSpecs}
                        disabled={isConsolidating}
                        className={cn(
                          "w-full mt-4 py-2.5 border rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                          isSpecsConfirmed
                            ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        )}
                      >
                        {isConsolidating ? <Loader2 size={14} className="animate-spin" /> : (isSpecsConfirmed ? <CheckCircle2 size={14} /> : <LayoutList size={14} />)}
                        {isConsolidating ? '正在分析規格...' : (isSpecsConfirmed ? '已確認全數規格 (點擊重新檢視)' : '規格彙總與矛盾檢測')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isSpecsConfirmed && (
            <div className="pt-4 border-t border-slate-100">
              <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <label className="block text-xs font-black text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles size={14} /> 確認購案項目與細節
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="輸入購案項目名稱 (例如：紅包袋)"
                  className="w-full p-3 bg-white border border-blue-200 rounded-xl font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                {itemName.trim() && !confirmedItemDescription && (
                  <button
                    onClick={() => handleStartItemClarification()}
                    className="mt-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm w-full justify-center"
                  >
                    <BrainCircuit size={16} /> 依據規格進行 AI 品項釐清
                  </button>
                )}
                {confirmedItemDescription && (
                  <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl" ref={confirmedItemRef}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black text-green-700 flex items-center gap-1">
                        <CheckCircle2 size={16} /> 已確認品項類別與細節
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSectionScreenshot(confirmedItemRef.current, 'confirmed-item')}
                          className="p-1 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="截圖此區塊"
                        >
                          <Camera size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmedItemDescription('')}
                          className="text-xs text-green-600 hover:text-green-800 underline font-bold"
                        >
                          重新釐清
                        </button>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none prose-green">
                      <Markdown remarkPlugins={[remarkGfm]}>{confirmedItemDescription}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={runAiAnalysis}
            disabled={!isSpecsConfirmed || isAnalyzing || !confirmedItemDescription}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 mb-4",
              (!isSpecsConfirmed || isAnalyzing || !confirmedItemDescription) ? "bg-slate-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-200"
            )}
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <BrainCircuit size={20} />
                {(!isSpecsConfirmed || !confirmedItemDescription) ? '請先完成規格與品項確認' : '執行 AI 綜合評估'}
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
};
