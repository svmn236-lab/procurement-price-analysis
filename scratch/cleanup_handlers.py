import os

def cleanup_handlers():
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of handleAddVendor
    start_marker = 'const handleAddVendor = () => {'
    start_index = content.find(start_marker)
    
    if start_index == -1:
        print("Could not find handleAddVendor")
        return

    # Everything after start_index is the functions
    functions_part = content[start_index:]
    
    # We also need the destructuring at the top
    # Let's rebuild the whole file
    
    all_states = [
        "activeTab", "setActiveTab", "strategy", "setStrategy",
        "itemName", "setItemName", "isItemModalOpen", "setIsItemModalOpen",
        "itemChatMessages", "setItemChatMessages", "itemChatInput", "setItemChatInput",
        "isItemChatLoading", "setIsItemChatLoading", "proposedItemDescription", "setProposedItemDescription",
        "confirmedItemDescription", "setConfirmedItemDescription", "projectName", "setProjectName",
        "showProjectDetails", "setShowProjectDetails", "showProcurementInputs", "setShowProcurementInputs",
        "docNumber", "setDocNumber", "department", "setDepartment", "section", "setSection",
        "applicant", "setApplicant", "budgetAmount", "setBudgetAmount",
        "handlingSection", "setHandlingSection", "handler", "setHandler", "totalQty", "setTotalQty",
        "vendors", "setVendors", "aiInsights", "setAiInsights", "isAnalyzing", "setIsAnalyzing",
        "specFile", "setSpecFile", "aiEstimatedPrice", "setAiEstimatedPrice",
        "costBreakdown", "setCostBreakdown", "showBreakdown", "setShowBreakdown",
        "showAiInsights", "setShowAiInsights", "supplementarySpecs", "setSupplementarySpecs",
        "quoteTimeframe", "setQuoteTimeframe", "consolidatedSpecs", "setConsolidatedSpecs",
        "isConsolidating", "setIsConsolidating", "showSpecSummary", "setShowSpecSummary",
        "isSpecsConfirmed", "setIsSpecsConfirmed", "consolidationError", "setConsolidationError",
        "editingSpecIndex", "setEditingSpecIndex", "editingContent", "setEditingContent",
        "activeChatId", "setActiveChatId", "chatMessages", "setChatMessages",
        "chatInput", "setChatInput", "isChatLoading", "setIsChatLoading",
        "overallChatMessages", "setOverallChatMessages", "overallChatInput", "setOverallChatInput",
        "isOverallChatLoading", "setIsOverallChatLoading", "showOverallChat", "setShowOverallChat",
        "costHistory", "setCostHistory", "showDiffModal", "setShowDiffModal",
        "expandedDiffId", "setExpandedDiffId", "diffExplanations", "setDiffExplanations",
        "showVendorSection", "setShowVendorSection", "savedProjects", "setSavedProjects",
        "showSavedProjectsModal", "setShowSavedProjectsModal", "currentProjectId", "setCurrentProjectId",
        "historyFeedback", "setHistoryFeedback", "alternatives", "setAlternatives",
        "showAlternativesModal", "setShowAlternativesModal", "isFetchingAlternatives", "setIsFetchingAlternatives",
        "recommendedVendors", "setRecommendedVendors", "showRecommendedVendorsModal", "setShowRecommendedVendorsModal",
        "isFetchingRecommendedVendors", "setIsFetchingRecommendedVendors",
        "phase2", "setPhase2", "phase2Error", "setPhase2Error",
        "isPhase2Parsing", "setIsPhase2Parsing", "isPhase2Aligning", "setIsPhase2Aligning",
        "isPhase2Negotiating", "setIsPhase2Negotiating", "selectedAnalysisItem", "setSelectedAnalysisItem",
        "phase2AnalysisError", "setPhase2AnalysisError", "isPhase2AnalysisLoading", "setIsPhase2AnalysisLoading",
        "phase3", "setPhase3", "expandedNegotiationItems", "setExpandedNegotiationItems",
        "isPhase2ChatLoading", "setIsPhase2ChatLoading", "phase2ChatInput", "setPhase2ChatInput",
        "vendorPdfInputRef", "appRef", "confirmedItemRef", "aiInsightsRef", "historyImportRef"
    ]
    
    all_calcs = ["activeCostItem", "stats", "chartData"]
    
    imports = '''import React, { useState, useRef, useMemo, useCallback } from "react";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { MessageSquare } from "lucide-react";
import { 
  Vendor, CostItem, ConsolidatedSpec, CostHistoryEntry, 
  AlternativeProduct, RecommendedVendor, Phase2State, Phase2AlignedRow, 
  NegotiationRecord, SavedProject, HistoryExcelRow, Phase3State
} from "@/types/procurement";
import { INITIAL_VENDORS, GEMINI_PDF_VISION_MODEL, GEMINI_PHASE2_TEXT_MODEL, extractJsonArrayFromText } from "@/lib/constants";
'''

    header = '''
export function useProcurementHandlers(states: any, calculations: any) {
  const { 
    %s 
  } = states;
  const { 
    %s 
  } = calculations;

  // 議價表單組件 (內部定義或搬移至此)
  const NegotiationForm = ({
    item,
    currentRecord,
    onSave,
    onCancel
  }: {
    item: string;
    currentRecord?: NegotiationRecord;
    onSave: (record: NegotiationRecord) => void;
    onCancel: () => void;
  }) => {
    const [negotiatedPrice, setNegotiatedPrice] = useState(currentRecord?.negotiatedPrice || 0);
    const [isAccepted, setIsAccepted] = useState(currentRecord?.isAccepted ?? true);
    const [reason, setReason] = useState(currentRecord?.reason || '');
    const handleSave = () => {
      const record: NegotiationRecord = {
        item,
        negotiatedPrice,
        isAccepted,
        reason: reason.strip ? reason.trim() : reason,
        timestamp: Date.now(),
      };
      onSave(record);
    };
    return (
      <div className="bg-white border border-violet-200 rounded-xl p-4 shadow-sm">
        <h5 className="font-bold text-violet-900 mb-3 flex items-center gap-2">
          <MessageSquare size={16} />
          {item} - 議價回饋
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">議價後金額</label>
            <input
              type="number"
              step="0.01"
              value={negotiatedPrice}
              onChange={(e) => setNegotiatedPrice(Number(e.target.value) || 0)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-violet-500 outline-none"
              placeholder="輸入議價後金額"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">接受狀態</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={isAccepted}
                  onChange={() => setIsAccepted(true)}
                  className="text-violet-600"
                />
                <span className="text-sm text-emerald-700 font-medium">接受</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={!isAccepted}
                  onChange={() => setIsAccepted(false)}
                  className="text-violet-600"
                />
                <span className="text-sm text-red-700 font-medium">不接受</span>
              </label>
            </div>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">原因說明</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-violet-500 outline-none resize-none"
              rows={2}
              placeholder={isAccepted ? "為什麼接受這個價格？" : "為什麼不接受？廠商的反應是什麼？"}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            儲存議價記錄
          </button>
        </div>
      </div>
    );
  };

''' % (", ".join(all_states), ", ".join(all_calcs))

    # We also need to extract all the function names for the return statement
    # Let's just find all 'const name = ...' in the functions_part
    import re
    handler_vars = re.findall(r'const (\w+) = (?:async )?\(', functions_part)
    # Also add buildProjectSnapshot and any other consts
    handler_vars += re.findall(r'const (\w+) = ', functions_part)
    handler_vars = sorted(list(set(handler_vars)))
    # Add NegotiationForm to return
    handler_vars.append('NegotiationForm')
    
    footer = '\n  return { %s };\n}\n' % (", ".join(sorted(handler_vars)))
    
    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(imports + header + functions_part.rsplit('\n\n  return {', 1)[0] + footer)

cleanup_handlers()
