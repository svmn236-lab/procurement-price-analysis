import React, { useState, useRef, useMemo, useCallback } from "react";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { MessageSquare } from "lucide-react";
import { 
  Vendor, CostItem, ConsolidatedSpec, CostHistoryEntry, 
  AlternativeProduct, RecommendedVendor, Phase2State, Phase2AlignedRow, 
  NegotiationRecord, SavedProject, HistoryExcelRow, Phase3State, VendorPdfLineItem
} from "@/types/procurement";
import { INITIAL_VENDORS } from "@/lib/constants";
import * as actions from "@/actions/aiActions";

export function useProcurementHandlers(states: any, calculations: any) {
const { 
    activeTab, setActiveTab, strategy, setStrategy, itemName, setItemName, isItemModalOpen, setIsItemModalOpen, itemChatMessages, setItemChatMessages, itemChatInput, setItemChatInput, isItemChatLoading, setIsItemChatLoading, proposedItemDescription, setProposedItemDescription, confirmedItemDescription, setConfirmedItemDescription, projectName, setProjectName, showProjectDetails, setShowProjectDetails, showProcurementInputs, setShowProcurementInputs, docNumber, setDocNumber, department, setDepartment, section, setSection, applicant, setApplicant, budgetAmount, setBudgetAmount, handlingSection, setHandlingSection, handler, setHandler, totalQty, setTotalQty, vendors, setVendors, aiInsights, setAiInsights, isAnalyzing, setIsAnalyzing, specFile, setSpecFile, aiEstimatedPrice, setAiEstimatedPrice, costBreakdown, setCostBreakdown, showBreakdown, setShowBreakdown, showAiInsights, setShowAiInsights, supplementarySpecs, setSupplementarySpecs, quoteTimeframe, setQuoteTimeframe, consolidatedSpecs, setConsolidatedSpecs, isConsolidating, setIsConsolidating, showSpecSummary, setShowSpecSummary, isSpecsConfirmed, setIsSpecsConfirmed, consolidationError, setConsolidationError, editingSpecIndex, setEditingSpecIndex, editingContent, setEditingContent, activeChatId, setActiveChatId, chatMessages, setChatMessages, chatInput, setChatInput, isChatLoading, setIsChatLoading, overallChatMessages, setOverallChatMessages, overallChatInput, setOverallChatInput, isOverallChatLoading, setIsOverallChatLoading, showOverallChat, setShowOverallChat, costHistory, setCostHistory, showDiffModal, setShowDiffModal, expandedDiffId, setExpandedDiffId, diffExplanations, setDiffExplanations, showVendorSection, setShowVendorSection, savedProjects, setSavedProjects, showSavedProjectsModal, setShowSavedProjectsModal, currentProjectId, setCurrentProjectId, historyFeedback, setHistoryFeedback, alternatives, setAlternatives, showAlternativesModal, setShowAlternativesModal, isFetchingAlternatives, setIsFetchingAlternatives, recommendedVendors, setRecommendedVendors, showRecommendedVendorsModal, setShowRecommendedVendorsModal, isFetchingRecommendedVendors, setIsFetchingRecommendedVendors, phase2, setPhase2, phase2Error, setPhase2Error, isPhase2Parsing, setIsPhase2Parsing, isPhase2Aligning, setIsPhase2Aligning, isPhase2Negotiating, setIsPhase2Negotiating, selectedAnalysisItem, setSelectedAnalysisItem, phase2AnalysisError, setPhase2AnalysisError, isPhase2AnalysisLoading, setIsPhase2AnalysisLoading, phase3, setPhase3, expandedNegotiationItems, setExpandedNegotiationItems, isPhase2ChatLoading, setIsPhase2ChatLoading, phase2ChatInput, setPhase2ChatInput, vendorPdfInputRef, appRef, confirmedItemRef, aiInsightsRef, historyImportRef 
  } = states;
  const { 
    activeCostItem, stats, chartData 
  } = calculations;

  // 議價表單組件
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
        reason: reason.trim(),
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

  const handleAddVendor = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setVendors(prev => [...prev, { id: newId, name: '', price: 0 }]);
  };

  const handleRemoveVendor = (id: string) => {
    setVendors(prev => prev.filter(v => v.id !== id));
  };

  const handleVendorChange = (id: string, field: keyof Vendor, value: string | number) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleClearAll = () => {
    setItemName('');
    setIsItemModalOpen(false);
    setItemChatMessages([]);
    setItemChatInput('');
    setIsItemChatLoading(false);
    setProposedItemDescription('');
    setConfirmedItemDescription('');
    setProjectName('');
    setShowProjectDetails(false);
    setShowProcurementInputs(true);
    setDocNumber('');
    setDepartment('');
    setSection('');
    setApplicant('');
    setBudgetAmount('');
    setHandlingSection('');
    setHandler('');
    setTotalQty('');
    setVendors(INITIAL_VENDORS);
    setAiInsights('');
    setIsAnalyzing(false);
    setSpecFile(null);
    setAiEstimatedPrice(null);
    setCostBreakdown([]);
    setShowBreakdown(false);
    setShowAiInsights(false);
    setSupplementarySpecs(['']);
    setQuoteTimeframe('');
    setConsolidatedSpecs([]);
    setIsConsolidating(false);
    setShowSpecSummary(false);
    setIsSpecsConfirmed(false);
    setConsolidationError(null);
    setActiveChatId(null);
    setChatMessages([]);
    setChatInput('');
    setIsChatLoading(false);
    setOverallChatMessages([]);
    setOverallChatInput('');
    setIsOverallChatLoading(false);
    setShowOverallChat(true);
    setCostHistory([]);
    setShowDiffModal(false);
    setExpandedDiffId(null);
    setDiffExplanations({});
    setCurrentProjectId(null);
    setAlternatives([]);
    setRecommendedVendors([]);
    setPhase2(null);
    setPhase2Error(null);
    setIsPhase2Parsing(false);
    setIsPhase2Aligning(false);
    setIsPhase2Negotiating(false);
  };

  const buildProjectSnapshot = (projectId: string, desc?: string, overrides?: Partial<SavedProject>): SavedProject => ({
    id: projectId,
    timestamp: Date.now(),
    projectName: projectName || '未命名購案',
    itemName,
    docNumber,
    department,
    section,
    applicant,
    budgetAmount,
    handlingSection,
    handler,
    totalQty,
    vendors,
    supplementarySpecs,
    consolidatedSpecs,
    isSpecsConfirmed,
    confirmedItemDescription: desc !== undefined ? desc : confirmedItemDescription,
    quoteTimeframe,
    aiInsights,
    aiEstimatedPrice,
    costBreakdown,
    costHistory,
    overallChatMessages,
    alternatives,
    recommendedVendors,
    phase2: phase2 ?? undefined,
    phase3: phase3 ?? undefined,
    ...overrides
  });

  const saveCurrentProject = (desc?: string, overrides?: Partial<SavedProject>) => {
    const projectId = currentProjectId || Date.now().toString();
    setSavedProjects(prev => {
      const projectToSave = buildProjectSnapshot(projectId, desc, overrides);

      const existingIndex = prev.findIndex(p => p.id === projectId);
      if (existingIndex >= 0) {
        const newProjects = [...prev];
        newProjects[existingIndex] = projectToSave;
        return newProjects;
      } else {
        return [projectToSave, ...prev].slice(0, 5);
      }
    });
    setCurrentProjectId(projectId);
  };

  const loadProject = (project: SavedProject) => {
    setProjectName(project.projectName);
    setItemName(project.itemName);
    setDocNumber(project.docNumber);
    setDepartment(project.department);
    setSection(project.section);
    setApplicant(project.applicant);
    setBudgetAmount(project.budgetAmount);
    setHandlingSection(project.handlingSection);
    setHandler(project.handler);
    setTotalQty(project.totalQty);
    setVendors(project.vendors);
    setSupplementarySpecs(project.supplementarySpecs);
    setConsolidatedSpecs(project.consolidatedSpecs);
    setIsSpecsConfirmed(project.isSpecsConfirmed);
    setConfirmedItemDescription(project.confirmedItemDescription);
    setQuoteTimeframe(project.quoteTimeframe);
    setAiInsights(project.aiInsights);
    setAiEstimatedPrice(project.aiEstimatedPrice);
    setCostBreakdown(project.costBreakdown);
    setCostHistory(project.costHistory);
    setOverallChatMessages(project.overallChatMessages);
    setAlternatives(project.alternatives || []);
    setRecommendedVendors(project.recommendedVendors || []);
    setPhase2(project.phase2 ?? null);
    setPhase3(project.phase3 ?? { isMerged: false, justifications: {}, isGeneratingJustification: false });
    setPhase2Error(null);
    setShowSavedProjectsModal(false);
    setCurrentProjectId(project.id);
  };

  const getCurrentOrLatestProject = () => {
    if (currentProjectId) {
      const existing = savedProjects.find(p => p.id === currentProjectId);
      if (existing) return existing;
    }
    return buildProjectSnapshot(currentProjectId || Date.now().toString());
  };

  const exportHistoryAsExcel = () => {
    const currentSnapshot = getCurrentOrLatestProject();
    const mergedProjects = [currentSnapshot, ...savedProjects.filter(p => p.id !== currentSnapshot.id)].slice(0, 50);

    const rows: HistoryExcelRow[] = mergedProjects.map((project) => {
      const strategy =
        project.costBreakdown
          .slice(0, 3)
          .map((item) => `${item.item}: ${item.basis}`)
          .join(' | ') || '無';

      return {
        匯出版本: 'xlsx-v2',
        匯出時間: new Date().toISOString(),
        專案ID: project.id,
        日期: new Date(project.timestamp).toISOString(),
        專案名稱: project.projectName,
        品項名稱: project.itemName,
        確認品項描述: project.confirmedItemDescription,
        採購總量: project.totalQty,
        預算金額: project.budgetAmount,
        報價區間: project.quoteTimeframe,
        AI估算單價: project.aiEstimatedPrice,
        AI分析結果: project.aiInsights,
        採購策略: strategy,
        廠商報價JSON: JSON.stringify(project.vendors || []),
        成本分項JSON: JSON.stringify(project.costBreakdown || []),
        歷史估算JSON: JSON.stringify(project.costHistory || []),
        補充規格JSON: JSON.stringify(project.supplementarySpecs || []),
        彙總規格JSON: JSON.stringify(project.consolidatedSpecs || []),
        整體對話JSON: JSON.stringify(project.overallChatMessages || []),
        替代方案JSON: JSON.stringify(project.alternatives || []),
        推薦廠商JSON: JSON.stringify(project.recommendedVendors || []),
        文件編號: project.docNumber || '',
        部門: project.department || '',
        科別: project.section || '',
        申請人: project.applicant || '',
        承辦科: project.handlingSection || '',
        承辦人: project.handler || '',
        規格已確認: project.isSpecsConfirmed,
        第二階段JSON: JSON.stringify(project.phase2 ?? null),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
    XLSX.writeFile(workbook, `procurement-history-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setHistoryFeedback(`已匯出 ${mergedProjects.length} 筆紀錄`);
  };

  const parseJsonCell = <T,>(value: unknown, fallback: T): T => {
    if (typeof value !== 'string' || !value.trim()) return fallback;
    try {
      const parsed = JSON.parse(value);
      return parsed as T;
    } catch {
      return fallback;
    }
  };

  const normalizeImportedProject = (raw: Record<string, unknown>, index: number): SavedProject | null => {
    if (!raw || typeof raw !== 'object') return null;

    const requiredFields = ['專案ID', '日期', '專案名稱', '廠商報價JSON', '成本分項JSON'];
    const hasRequired = requiredFields.every(field => Object.prototype.hasOwnProperty.call(raw, field));
    if (!hasRequired) return null;

    const vendors = parseJsonCell<Vendor[]>(raw['廠商報價JSON'], []);
    const costBreakdownImported = parseJsonCell<CostItem[]>(raw['成本分項JSON'], []);
    const costHistoryImported = parseJsonCell<CostHistoryEntry[]>(raw['歷史估算JSON'], []);
    const supplementarySpecsImported = parseJsonCell<string[]>(raw['補充規格JSON'], ['']);
    const consolidatedSpecsImported = parseJsonCell<ConsolidatedSpec[]>(raw['彙總規格JSON'], []);
    const overallChatMessagesImported = parseJsonCell<{ role: 'user' | 'model', text: string }[]>(raw['整體對話JSON'], []);
    const alternativesImported = parseJsonCell<AlternativeProduct[]>(raw['替代方案JSON'], []);
    const recommendedVendorsImported = parseJsonCell<RecommendedVendor[]>(raw['推薦廠商JSON'], []);
    const phase2Raw = raw['第二階段JSON'];
    let phase2Imported: Phase2State | undefined;
    if (typeof phase2Raw === 'string' && phase2Raw.trim() && phase2Raw !== 'null') {
      const parsed = parseJsonCell<Phase2State | null>(phase2Raw, null);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.vendorPdfParsedLines) && Array.isArray(parsed.alignedRows)) {
        phase2Imported = {
          vendorPdfFileName: parsed.vendorPdfFileName ?? null,
          vendorPdfParsedLines: parsed.vendorPdfParsedLines,
          alignedRows: parsed.alignedRows,
          negotiationStrategy: typeof parsed.negotiationStrategy === 'string' ? parsed.negotiationStrategy : '',
          negotiationRecords: Array.isArray(parsed.negotiationRecords) ? parsed.negotiationRecords : [],
          phase2ChatMessages: Array.isArray(parsed.phase2ChatMessages) ? parsed.phase2ChatMessages : [],
        };
      }
    }

    if (!Array.isArray(vendors) || !Array.isArray(costBreakdownImported)) return null;

    const totalQtyRaw = raw['採購總量'];
    const budgetRaw = raw['預算金額'];
    const aiPriceRaw = raw['AI估算單價'];

    const timestamp = Date.parse(String(raw['日期'] || ''));

    return {
      id: String(raw['專案ID'] || `${Date.now()}-${index}`),
      timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp,
      projectName: String(raw['專案名稱'] || '未命名購案'),
      itemName: String(raw['品項名稱'] || ''),
      docNumber: String(raw['文件編號'] || ''),
      department: String(raw['部門'] || ''),
      section: String(raw['科別'] || ''),
      applicant: String(raw['申請人'] || ''),
      budgetAmount: budgetRaw === '' || budgetRaw === undefined || budgetRaw === null ? '' : Number(budgetRaw || 0),
      handlingSection: String(raw['承辦科'] || ''),
      handler: String(raw['承辦人'] || ''),
      totalQty: totalQtyRaw === '' || totalQtyRaw === undefined || totalQtyRaw === null ? '' : Number(totalQtyRaw || 0),
      vendors,
      supplementarySpecs: Array.isArray(supplementarySpecsImported) ? supplementarySpecsImported : [''],
      consolidatedSpecs: Array.isArray(consolidatedSpecsImported) ? consolidatedSpecsImported : [],
      isSpecsConfirmed: Boolean(raw['規格已確認']),
      confirmedItemDescription: String(raw['確認品項描述'] || ''),
      quoteTimeframe: String(raw['報價區間'] || ''),
      aiInsights: String(raw['AI分析結果'] || ''),
      aiEstimatedPrice: aiPriceRaw === '' || aiPriceRaw === undefined || aiPriceRaw === null ? null : Number(aiPriceRaw),
      costBreakdown: costBreakdownImported,
      costHistory: Array.isArray(costHistoryImported) ? costHistoryImported : [],
      overallChatMessages: Array.isArray(overallChatMessagesImported) ? overallChatMessagesImported : [],
      alternatives: Array.isArray(alternativesImported) ? alternativesImported : [],
      recommendedVendors: Array.isArray(recommendedVendorsImported) ? recommendedVendorsImported : [],
      phase2: phase2Imported,
    };
  };

  const handleImportHistoryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const historySheet = workbook.Sheets['History'] || workbook.Sheets[workbook.SheetNames[0]];
      if (!historySheet) {
        setHistoryFeedback('匯入失敗：找不到工作表');
        return;
      }

      const rawProjects = XLSX.utils.sheet_to_json<Record<string, unknown>>(historySheet, { defval: '' });
      if (rawProjects.length === 0) {
        setHistoryFeedback('匯入失敗：Excel 內容為空');
        return;
      }

      const requiredColumns = ['專案ID', '日期', '專案名稱', '廠商報價JSON', '成本分項JSON'];
      const firstRow = rawProjects[0];
      const missingColumns = requiredColumns.filter(col => !Object.prototype.hasOwnProperty.call(firstRow, col));
      if (missingColumns.length > 0) {
        setHistoryFeedback(`匯入失敗：缺少必要欄位 ${missingColumns.join('、')}`);
        return;
      }

      const normalized = rawProjects
        .map((p: Record<string, unknown>, idx: number) => normalizeImportedProject(p, idx))
        .filter((p: SavedProject | null): p is SavedProject => Boolean(p))
        .sort((a: SavedProject, b: SavedProject) => b.timestamp - a.timestamp);

      if (normalized.length === 0) {
        setHistoryFeedback('匯入失敗：Excel 格式不符或資料無法解析');
        return;
      }

      setSavedProjects(normalized.slice(0, 50));
      const toLoad = normalized[0];
      loadProject(toLoad);
      setHistoryFeedback(`已匯入 ${normalized.length} 筆紀錄並載入「${toLoad.projectName}」`);
    } catch (error) {
      console.error('Import History Error:', error);
      setHistoryFeedback('匯入失敗：請確認 .xlsx 格式是否正確');
    } finally {
      e.target.value = '';
    }
  };

  const getHistoricalLearningContext = () => {
    const candidates = savedProjects
      .filter(p => p.id !== currentProjectId && (p.aiInsights?.trim() || p.costBreakdown.length > 0))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);

    if (candidates.length === 0) return '';

    const context = candidates.map((p, idx) => {
      const keyBreakdown = p.costBreakdown
        .slice(0, 3)
        .map(b => `${b.item}: ${b.basis} / ${b.explanation}`)
        .join('\n');
      return [
        `案例 ${idx + 1}：${p.projectName}（${new Date(p.timestamp).toLocaleDateString()}）`,
        `品項：${p.confirmedItemDescription || p.itemName || '未填寫'}`,
        `報價區間：${p.quoteTimeframe || '未指定'}`,
        `談判/風險重點：${p.aiInsights || '無'}`,
        `成功判斷與議價邏輯摘要：\n${keyBreakdown || '無'}`
      ].join('\n');
    }).join('\n\n');

    return `
      Historical Learning Context (from prior successful analyses):
      ${context}

      Please reuse applicable judgement criteria and negotiation logic from these cases, but adapt to current specs and market timeframe.
    `;
  };

  const handleScreenshot = async () => {
    if (!appRef.current) return;
    try {
      const originalInputs = Array.from(appRef.current.querySelectorAll('input, textarea')) as (HTMLInputElement | HTMLTextAreaElement)[];
      
      const canvas = await html2canvas(appRef.current, { 
        scale: 2, 
        useCORS: true,
        onclone: (clonedDoc) => {
          const clonedApp = clonedDoc.querySelector('.min-h-screen');
          if (!clonedApp) return;
          
          const clonedInputs = Array.from(clonedApp.querySelectorAll('input, textarea')) as (HTMLInputElement | HTMLTextAreaElement)[];
          
          clonedInputs.forEach((clonedInput, index) => {
            const originalInput = originalInputs[index];
            if (!originalInput) return;
            
            const isTextarea = clonedInput.tagName.toLowerCase() === 'textarea';
            const isTextInput = clonedInput.tagName.toLowerCase() === 'input' && 
              ((clonedInput as HTMLInputElement).type === 'text' || (clonedInput as HTMLInputElement).type === 'number');
              
            if (isTextInput || isTextarea) {
              const div = clonedDoc.createElement('div');
              const value = originalInput.value;
              const placeholder = originalInput.placeholder;
              
              div.innerText = value || placeholder;
              div.className = clonedInput.className;
              
              const computedStyle = window.getComputedStyle(originalInput);
              div.style.boxSizing = 'border-box';
              div.style.height = computedStyle.height;
              div.style.width = computedStyle.width;
              div.style.padding = computedStyle.padding;
              div.style.font = computedStyle.font;
              div.style.fontSize = computedStyle.fontSize;
              div.style.fontWeight = computedStyle.fontWeight;
              div.style.lineHeight = computedStyle.lineHeight;
              div.style.color = value ? computedStyle.color : '#94a3b8';
              div.style.border = computedStyle.border;
              div.style.borderRadius = computedStyle.borderRadius;
              div.style.backgroundColor = computedStyle.backgroundColor;
              div.style.overflow = 'hidden';
              
              if (isTextInput) {
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.whiteSpace = 'nowrap';
              } else {
                div.style.whiteSpace = 'pre-wrap';
              }
              
              clonedInput.parentNode?.replaceChild(div, clonedInput);
            }
          });
        }
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `採購發包決策輔助系統_${new Date().getTime()}.png`;
      link.click();
    } catch (error) {
      console.error("Screenshot failed:", error);
    }
  };

  const handleSectionScreenshot = async (element: HTMLElement | null, fileName: string) => {
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = canvas.toDataURL("image/png");
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}-${Date.now()}.png`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Section Screenshot Error:', error);
    }
  };

  const handleSetAdopted = (entry: CostHistoryEntry) => {
    setCostHistory(prev => {
      const newHistory = prev.filter(e => e.id !== entry.id);
      return [entry, ...newHistory];
    });
    setAiInsights(entry.aiInsights);
    setAiEstimatedPrice(entry.totalPrice);
    setCostBreakdown(entry.breakdown);
  };

  const handleCompareDiff = async (oldEntry: CostHistoryEntry) => {
    if (expandedDiffId === oldEntry.id) {
      setExpandedDiffId(null);
      return;
    }
    setExpandedDiffId(oldEntry.id);
    
    if (diffExplanations[oldEntry.id]) return;

    setDiffExplanations(prev => ({ ...prev, [oldEntry.id]: { loading: true, text: '' } }));
    
    try {
      const newest = costHistory[0];
      const explanation = await actions.generateDiffAnalysisAction(newest, oldEntry);

      setDiffExplanations(prev => ({ 
        ...prev, 
        [oldEntry.id]: { loading: false, text: explanation || '無法產生差異分析。' } 
      }));
    } catch (error) {
      console.error('Diff Analysis Error:', error);
      setDiffExplanations(prev => ({ 
        ...prev, 
        [oldEntry.id]: { loading: false, text: '產生差異分析時發生錯誤，請稍後再試。' } 
      }));
    }
  };

  const handleDeleteHistoryEntry = (id: string) => {
    setCostHistory(prev => prev.filter(entry => entry.id !== id));
    if (expandedDiffId === id) {
      setExpandedDiffId(null);
    }
  };

  const handleAddSpec = () => setSupplementarySpecs(prev => [...prev, '']);

  const handleRemoveSpec = (index: number) => {
    setSupplementarySpecs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSpecChange = (index: number, value: string) => {
    setSupplementarySpecs(prev => {
      const newSpecs = [...prev];
      newSpecs[index] = value;
      return newSpecs;
    });
  };

  const startEditing = (index: number, content: string) => {
    setEditingSpecIndex(index);
    setEditingContent(content);
  };

  const saveEditing = async (index: number) => {
    const newSpecs = [...consolidatedSpecs];
    newSpecs[index].content = editingContent;
    setConsolidatedSpecs(newSpecs);
    setEditingSpecIndex(null);
    
    // Automatic re-extraction can be triggered here if needed, but keeping it manual to save quota
  };

  const cancelEditing = () => {
    setEditingSpecIndex(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleConsolidateSpecs = async () => {
    setShowSpecSummary(true);
    setIsConsolidating(true);
    setIsSpecsConfirmed(false);
    setConsolidationError(null);
    
    try {
      let base64Data: string | null = null;
      let mimeType: string | null = null;
      
      if (specFile) {
        base64Data = await fileToBase64(specFile);
        mimeType = specFile.type || 'application/pdf';
      }
      
      const suppSpecsText = supplementarySpecs.filter(s => s.trim()).map((s, i) => `${i + 1}. ${s}`).join('\n');
      
      const data = await actions.consolidateSpecsAction(
        base64Data,
        mimeType,
        confirmedItemDescription || itemName,
        suppSpecsText,
        quoteTimeframe
      );

      setConsolidatedSpecs(data.specs || []);
      if (data.totalQuantity && data.totalQuantity > 0) {
        setTotalQty(data.totalQuantity);
      }
    } catch (error: unknown) {
      console.error('Consolidation Error:', error);
      setConsolidatedSpecs([]);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        setConsolidationError('API 請求次數已達上限 (Quota Exceeded)。請稍後再試，或檢查您的 API Key 額度。');
      } else {
        setConsolidationError('規格分析失敗，請檢查網路連線或 API Key 設置。');
      }
    } finally {
      setIsConsolidating(false);
    }
  };

  const fetchAlternatives = async () => {
    setIsFetchingAlternatives(true);
    setShowAlternativesModal(true);
    try {
      const fetchedAlternatives = await actions.fetchAlternativesAction(confirmedItemDescription || itemName);
      setAlternatives(fetchedAlternatives);
      saveCurrentProject(undefined, { alternatives: fetchedAlternatives });
    } catch (error) {
      console.error('Fetch Alternatives Error:', error);
    } finally {
      setIsFetchingAlternatives(false);
    }
  };

  const fetchRecommendedVendors = async () => {
    setIsFetchingRecommendedVendors(true);
    setShowRecommendedVendorsModal(true);
    try {
      const fetchedVendors = await actions.fetchRecommendedVendorsAction(confirmedItemDescription || itemName);
      setRecommendedVendors(fetchedVendors);
      saveCurrentProject(undefined, { recommendedVendors: fetchedVendors });
    } catch (error) {
      console.error('Fetch Vendors Error:', error);
    } finally {
      setIsFetchingRecommendedVendors(false);
    }
  };

  const parseVendorQuotePdfWithGemini = async (base64Pdf: string): Promise<VendorPdfLineItem[]> => {
    return await actions.parseVendorQuotePdfAction(base64Pdf);
  };

  const alignCostStructures = async (
    vendorLines: VendorPdfLineItem[]
  ): Promise<{ category: string; item: string; vendorQuote: number; aiReasonableEstimate: number; calculationLogic: string; consultantAnalysis: string; groupId: number; groupName: string }[]> => {
    const aiContext = {
      aiEstimatedPrice,
      totalQty,
      itemDescription: confirmedItemDescription || itemName,
      quoteTimeframe: quoteTimeframe || '未指定',
      costBreakdown,
      aiInsights: aiInsights?.slice(0, 6000),
    };

    return await actions.alignCostStructuresAction(vendorLines, aiContext);
  };

  const generatePhase2NegotiationStrategy = async (
    aligned: Phase2AlignedRow[],
    negotiationRecords: NegotiationRecord[] = []
  ): Promise<string> => {
    return await actions.generatePhase2NegotiationStrategyAction(aligned, negotiationRecords);
  };

  const toggleNegotiationForm = (item: string) => {
    setExpandedNegotiationItems(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const saveNegotiationRecord = (record: NegotiationRecord) => {
    setPhase2(prev => {
      if (!prev) return prev;
      const existingIndex = prev.negotiationRecords?.findIndex(r => r.item === record.item) ?? -1;
      const newRecords = [...(prev.negotiationRecords || [])];

      if (existingIndex >= 0) {
        newRecords[existingIndex] = record;
      } else {
        newRecords.push(record);
      }

      const updatedPhase2 = { ...prev, negotiationRecords: newRecords };
      saveCurrentProject(undefined, { phase2: updatedPhase2 });
      return updatedPhase2;
    });
    setExpandedNegotiationItems(prev => prev.filter(i => i !== record.item));
  };

  const updateRowGrouping = (item: string, groupId: number, groupName: string) => {
    setPhase2(prev => {
      if (!prev) return prev;
      const updatedRows = prev.alignedRows.map(r =>
        r.item === item ? { ...r, groupId, groupName } : r
      );
      const updatedPhase2 = { ...prev, alignedRows: updatedRows };
      saveCurrentProject(undefined, { phase2: updatedPhase2 });
      return updatedPhase2;
    });
  };

  const handlePhase2ChatMessage = async () => {
    if (!phase2ChatInput.trim() || !phase2) return;

    const userMessage = phase2ChatInput.trim();
    setPhase2ChatInput('');
    setIsPhase2ChatLoading(true);

    try {
      const contextData = {
        alignedRows: phase2.alignedRows,
        negotiationRecords: phase2.negotiationRecords || [],
        itemDescription: confirmedItemDescription || itemName,
        quoteTimeframe: quoteTimeframe || '未指定',
      };

      const systemPrompt = `你是一位專業的採購議價顧問。目前正在討論購案「${confirmedItemDescription || itemName}」的廠商報價分析。`;

      const aiReply = await actions.handleChatMessageAction(
        phase2.phase2ChatMessages?.map(m => ({ role: m.role as 'user' | 'model', text: m.text })) || [],
        userMessage,
        JSON.stringify(contextData),
        systemPrompt
      );

      setPhase2(prev => {
        if (!prev) return prev;
        const newMessages: Phase2State['phase2ChatMessages'] = [
          ...(prev.phase2ChatMessages || []),
          { role: 'user' as const, text: userMessage },
          { role: 'assistant' as const, text: aiReply }
        ];
        const updatedPhase2 = { ...prev, phase2ChatMessages: newMessages };
        saveCurrentProject(undefined, { phase2: updatedPhase2 });
        return updatedPhase2;
      });

    } catch (error: unknown) {
      console.error('Phase 2 Chat Error:', error);
      let errorMessage = '通訊發生錯誤，請稍後再試。';
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API 請求次數已達上限 (Quota Exceeded)。請稍後再試，或檢查您的 API Key 額度。';
      }

      setPhase2(prev => {
        if (!prev) return prev;
        const newMessages: Phase2State['phase2ChatMessages'] = [
          ...(prev.phase2ChatMessages || []),
          { role: 'user' as const, text: userMessage },
          { role: 'assistant' as const, text: errorMessage }
        ];
        return { ...prev, phase2ChatMessages: newMessages };
      });
    } finally {
      setIsPhase2ChatLoading(false);
    }
  };

  const generatePhase2AnalysisForItem = async (
    row: Phase2AlignedRow,
    currentPhase2: Phase2State
  ): Promise<{ category: string; calculationLogic: string; consultantAnalysis: string; assistantReply: string }> => {
    const results = await actions.batchGeneratePhase2AnalysisAction(
      [row],
      confirmedItemDescription || itemName,
      totalQty,
      aiEstimatedPrice,
      costBreakdown,
      quoteTimeframe || '未指定'
    );
    const result = results[0] || {};
    const assistantReply = [
      `### 【${row.item}】AI 基準價：$${row.aiEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ``,
      `**所屬分類**: ${result.category || '未分類'}`,
      ``,
      `**估算邏輯**`,
      result.calculationLogic || '（未取得估算邏輯）',
      ``,
      `**市場洞察與顧問建議**`,
      result.consultantAnalysis || '（未取得市場洞察與顧問建議）',
    ].join('\n');

    return { 
      category: result.category || '未分類', 
      calculationLogic: result.calculationLogic || '', 
      consultantAnalysis: result.consultantAnalysis || '', 
      assistantReply 
    };
  };

  const handleSelectPhase2AnalysisItem = async (row: Phase2AlignedRow) => {
    setSelectedAnalysisItem(row);
    setPhase2AnalysisError(null);
    if (!phase2) return;
  };

  const handleBatchGeneratePhase2Analysis = async () => {
    if (!phase2) return;
    
    // 鎖定狀態防止重複觸發
    setIsPhase2AnalysisLoading(true);
    setPhase2AnalysisError(null);

    try {
      // 選取所有尚未有分析結果的細項 (或您可以根據需求改為 phase2.alignedRows 直接全數重刷)
      const itemsToAnalyze = phase2.alignedRows.filter(r => !r.calculationLogic?.trim() || !r.consultantAnalysis?.trim());
      
      if (itemsToAnalyze.length === 0) {
        setIsPhase2AnalysisLoading(false);
        return;
      }

      // 執行「真・批次」AI 請求：僅此一次 API Call
      const results = await actions.batchGeneratePhase2AnalysisAction(
        itemsToAnalyze,
        confirmedItemDescription || itemName,
        totalQty,
        aiEstimatedPrice,
        costBreakdown,
        quoteTimeframe || '未指定'
      );

      setPhase2(prev => {
        if (!prev) return prev;
        const newRows = prev.alignedRows.map(row => {
          const result = results.find((res: any) => res.item === row.item);
          if (result) {
            return {
              ...row,
              category: result.category || row.category || '未分類',
              calculationLogic: result.calculationLogic || row.calculationLogic || '',
              consultantAnalysis: result.consultantAnalysis || row.consultantAnalysis || ''
            };
          }
          return row;
        });

        const newMessages: Phase2State['phase2ChatMessages'] = [
          ...(prev.phase2ChatMessages || []),
          { role: 'user' as const, text: `請批次產出剩餘 ${itemsToAnalyze.length} 個項目的估算邏輯與建議。` },
          { role: 'assistant' as const, text: `已完成 ${results.length} 個項目的「真・批次分析」。本次操作僅消耗 1 次 API 請求，有效避免 Quota 錯誤。` },
        ];

        const updatedPhase2 = { ...prev, alignedRows: newRows, phase2ChatMessages: newMessages };
        saveCurrentProject(undefined, { phase2: updatedPhase2 });
        return updatedPhase2;
      });

    } catch (error: unknown) {
      console.error('Batch analysis error:', error);
      const message = error instanceof Error ? error.message : '';
      let errorMessage = '批次分析失敗，請稍後重試。';
      
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API 請求次數限制 (429 Quota Exceeded)。系統已執行真・批次優化，請稍候片刻再試。';
      }
      
      setPhase2AnalysisError(errorMessage);
    } finally {
      setIsPhase2AnalysisLoading(false);
    }
  };

  const regenerateNegotiationStrategy = async () => {
    if (!phase2) return;

    setIsPhase2Negotiating(true);
    try {
      const newStrategy = await generatePhase2NegotiationStrategy(
        phase2.alignedRows,
        phase2.negotiationRecords || []
      );

      setPhase2(prev => {
        if (!prev) return prev;
        const updatedPhase2 = { ...prev, negotiationStrategy: newStrategy };
        saveCurrentProject(undefined, { phase2: updatedPhase2 });
        return updatedPhase2;
      });
    } catch (error) {
      console.error('Regenerate Strategy Error:', error);
    } finally {
      setIsPhase2Negotiating(false);
    }
  };

  const getCommittedPrice = (item: string, vendorQuote: number, records: NegotiationRecord[] = []) => {
    const record = records.find(r => r.item === item && r.isAccepted);
    return record ? record.negotiatedPrice : vendorQuote;
  };

  const generateCostJustification = async (
    targetItems: { category: string; item: string; vendorQuote: number; finalPrice: number }[],
    isMergedMode: boolean
  ) => {
    if (targetItems.length === 0) return;

    setPhase3(prev => ({ ...prev, isGeneratingJustification: true }));
    try {
      const newJustifications = await actions.generateCostJustificationAction(
        targetItems,
        isMergedMode,
        confirmedItemDescription || itemName
      );

      setPhase3(prev => ({
        ...prev,
        justifications: { ...prev.justifications, ...newJustifications },
        isGeneratingJustification: false
      }));

    } catch (error) {
      console.error('Generate justification error:', error);
      setPhase3(prev => ({ ...prev, isGeneratingJustification: false }));
    }
  };

  const handleTogglePhase3Merge = async (checked: boolean) => {
    setPhase3(prev => ({ ...prev, isMerged: checked }));
  };

  const aggregatePhase3Data = (p2: Phase2State, isMerged: boolean) => {
    if (!isMerged) {
      return p2.alignedRows
        .sort((a, b) => a.groupId - b.groupId || a.item.localeCompare(b.item))
        .map(r => ({
          groupId: r.groupId,
          groupName: r.groupName,
          category: r.groupName,
          name: r.item,
          vendorQuote: r.vendorQuote,
          finalPrice: getCommittedPrice(r.item, r.vendorQuote, p2.negotiationRecords)
        }));
    }

    const map = new Map<number, { groupId: number; groupName: string; vendorQuote: number; finalPrice: number }>();
    p2.alignedRows.forEach(r => {
      const groupKey = r.groupId;
      const fp = getCommittedPrice(r.item, r.vendorQuote, p2.negotiationRecords);
      const existing = map.get(groupKey) || { groupId: r.groupId, groupName: r.groupName, vendorQuote: 0, finalPrice: 0 };
      map.set(groupKey, {
        groupId: r.groupId,
        groupName: r.groupName,
        vendorQuote: existing.vendorQuote + r.vendorQuote,
        finalPrice: existing.finalPrice + fp
      });
    });

    return Array.from(map.values())
      .sort((a, b) => a.groupId - b.groupId)
      .map(v => ({
        groupId: v.groupId,
        groupName: v.groupName,
        category: v.groupName,
        name: v.groupName,
        vendorQuote: v.vendorQuote,
        finalPrice: v.finalPrice
      }));
  };

  const regenerateAllPhase3Justifications = async () => {
    if (!phase2) return;
    const aggregated = aggregatePhase3Data(phase2, phase3.isMerged);
    const targetItems = aggregated.map(a => ({
      category: a.category,
      item: a.name,
      vendorQuote: a.vendorQuote,
      finalPrice: a.finalPrice
    }));
    await generateCostJustification(targetItems, phase3.isMerged);
  };

  /**
   * [重構版] 處理上傳檔案：支援 PDF 與 XLSX，並落實 Single Request
   * 確保流程 100% 只有一次 API 請求，無任何迴圈地雷
   */
  const handleVendorQuotePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    file.type === 'application/vnd.ms-excel' || 
                    file.name.toLowerCase().endsWith('.xlsx') || 
                    file.name.toLowerCase().endsWith('.xls');

    if (!isPdf && !isExcel) {
      setPhase2Error('請上傳 .pdf 或 .xlsx 格式的報價單。');
      return;
    }
    if (aiEstimatedPrice === null || costBreakdown.length === 0) {
      setPhase2Error('請先完成第一階段「AI 模擬報價」後再上傳報價單。');
      return;
    }

    setPhase2Error(null);
    setIsPhase2Parsing(true);

    try {
      const aiContext = {
        aiEstimatedPrice,
        totalQty,
        itemDescription: confirmedItemDescription || itemName,
        quoteTimeframe: quoteTimeframe || '未指定',
        costBreakdown,
        aiInsights: aiInsights?.slice(0, 4000),
      };

      let alignedResults: any[] = [];

      if (isPdf) {
        // PDF 流程：單一請求架構 (Single Request)
        const base64 = await fileToBase64(file);
        alignedResults = await actions.parseAndAlignVendorQuoteAction(base64, aiContext);
      } else {
        // Excel 流程：整包傳送 (嚴格禁止 .map 呼叫 API)
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        
        // 1. 在前端將 Excel 列資料整理成陣列
        const parsedExcelData = rows.slice(1).map(row => {
          if (!Array.isArray(row)) return null;
          return {
            item: String(row[0] || '').trim(),
            vendorQuote: Number(row[row.length - 1]) || 0
          };
        }).filter(r => r && r.item && r.vendorQuote > 0);

        // 2. 正確的單一請求：把整包 parsedExcelData 丟給 Action
        alignedResults = await actions.alignExcelQuoteAction(parsedExcelData, aiContext);
      }

      // 3. 處理回傳結果並綁定到狀態
      const alignedRows = alignedResults.map(r => {
        const aiEst = r.aiReasonableEstimate || 0;
        const diff = r.vendorQuote - aiEst;
        return {
          ...r,
          aiEstimate: aiEst,
          varianceAmount: diff,
          variancePercent: aiEst !== 0 ? (diff / aiEst) * 100 : 0
        };
      });

      const nextPhase2: Phase2State = {
        vendorPdfFileName: file.name,
        vendorPdfParsedLines: alignedRows.map(r => ({ item: r.item, amount: r.vendorQuote })),
        alignedRows,
        negotiationStrategy: '點擊下方按鈕生成詳細談判策略...',
        negotiationRecords: [],
        phase2ChatMessages: [],
      };

      setPhase2(nextPhase2);
      saveCurrentProject(undefined, { phase2: nextPhase2 });

    } catch (err: unknown) {
      console.error('Final File Upload Refactor Error:', err);
      const msg = err instanceof Error ? err.message : '解析失敗。';
      setPhase2Error(msg.includes('429') ? 'API 請求過於頻繁，請等待系統冷卻約 60 秒後再試。' : '檔案解析錯誤，請檢查 Excel 格式。');
    } finally {
      setIsPhase2Parsing(false);
    }
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      let specsContext = "";
      if (isSpecsConfirmed && consolidatedSpecs.length > 0) {
        specsContext = "已確認之最終規格 (Confirmed Specifications):\n" + consolidatedSpecs.map((s, i) => `${i + 1}. [${s.category}] ${s.content}`).join('\n');
      } else {
        const suppSpecsText = supplementarySpecs.filter(s => s.trim()).map((s, i) => `${i + 1}. ${s}`).join('\n');
        specsContext = "補充規格條件 (Supplementary Specifications):\n" + (suppSpecsText || '無');
      }

      const data = await actions.runAiAnalysisAction(
        confirmedItemDescription || itemName,
        totalQty,
        vendors.filter(v => v.price > 0),
        specsContext,
        quoteTimeframe || '未指定',
        getHistoricalLearningContext()
      );
      
      setAiInsights(data.insights || "無分析建議");
      setAiEstimatedPrice(data.estimatedPrice || stats.minPrice * 0.95);
      setCostBreakdown(data.breakdown || []);
      setPhase2(null);
      setPhase2Error(null);

      const newEntry: CostHistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        totalPrice: data.estimatedPrice || stats.minPrice * 0.95,
        breakdown: data.breakdown || [],
        aiInsights: data.insights || "無分析建議"
      };
      
      setCostHistory(prev => {
        const newHistory = [newEntry, ...prev].slice(0, 5);
        saveCurrentProject(undefined, {
          aiInsights: data.insights || "無分析建議",
          aiEstimatedPrice: data.estimatedPrice || stats.minPrice * 0.95,
          costBreakdown: data.breakdown || [],
          costHistory: newHistory,
          phase2: undefined,
          phase3: undefined,
        });
        return newHistory;
      });
    } catch (error: unknown) {
      console.error('AI Analysis Error:', error);
      let errorMessage = '分析過程中發生錯誤。';
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota')) {
        errorMessage = 'API 請求次數已達上限。';
      }
      setAiInsights(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenChat = (item: CostItem) => {
    setActiveChatId(item.item);
    setChatMessages([
      { 
        role: 'model', 
        text: `您好！關於「${item.item}」的計算基礎（${item.basis}），您有任何疑問嗎？` 
      }
    ]);
    setChatInput('');
  };

  const handleConditionChange = (index: number, value: string) => {
    setCostBreakdown(prev => prev.map((item, i) => i === index ? { ...item, customCondition: value } : item));
  };

  const handleUpdateCostItem = async (index: number) => {
    const itemToUpdate = costBreakdown[index];
    if (!itemToUpdate.customCondition) return;

    setCostBreakdown(prev => prev.map((item, i) => i === index ? { ...item, isUpdating: true } : item));
    try {
      const context = {
        itemName: confirmedItemDescription || itemName,
        itemToUpdate,
        quoteTimeframe: quoteTimeframe || '未指定'
      };

      const result = await actions.handleGenericChatAction(
        [],
        `請根據新條件重新估算成本：${itemToUpdate.customCondition}`,
        context,
        `你是一位資深採購專家。請重新估算指定項目的成本。`
      );

      const data = result.data || {};
      setCostBreakdown(prev => {
        const newBreakdown = [...prev];
        newBreakdown[index] = {
          ...newBreakdown[index],
          cost: data.cost ?? newBreakdown[index].cost,
          basis: data.basis || newBreakdown[index].basis,
          explanation: data.explanation || newBreakdown[index].explanation,
          isUpdating: false
        };
        const newTotal = newBreakdown.reduce((sum, item) => sum + item.cost, 0);
        setAiEstimatedPrice(newTotal);
        return newBreakdown;
      });
    } catch (error) {
      console.error("Error updating cost item:", error);
      setCostBreakdown(prev => prev.map((item, i) => i === index ? { ...item, isUpdating: false } : item));
    }
  };

  const handleStartItemClarification = async () => {
    setIsItemModalOpen(true);
    setItemChatMessages([{ role: 'ai', text: '您好！為了進行更精準的價格分析，請問您想要採購的品項具體用途或規格是什麼？' }]);
  };

  const handleSendItemChatMessage = async () => {
    if (!itemChatInput.trim()) return;
    const userMessage = itemChatInput.trim();
    setItemChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setItemChatInput('');
    setIsItemChatLoading(true);
    try {
      const context = {
        itemName,
        consolidatedSpecs: consolidatedSpecs.map(s => `[${s.category}] ${s.content}`)
      };

      const result = await actions.handleGenericChatAction(
        itemChatMessages.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', text: m.text })),
        userMessage,
        context,
        `你是一位專業的採購助理。協助釐清品項細節。`
      );

      setItemChatMessages(prev => [...prev, { role: 'ai', text: result.text }]);
      if (result.data?.isComplete && result.data?.itemDescription) {
        setProposedItemDescription(result.data.itemDescription);
      }
    } catch (error) {
      console.error("Error sending item chat message:", error);
      setItemChatMessages(prev => [...prev, { role: 'ai', text: "抱歉，系統發生錯誤。" }]);
    } finally {
      setIsItemChatLoading(false);
    }
  };

  const handleSendOverallChatMessage = async () => {
    if (!overallChatInput.trim()) return;

    const userMessage = overallChatInput.trim();
    setOverallChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setOverallChatInput('');
    setIsOverallChatLoading(true);
    try {
      const context = {
        itemName: confirmedItemDescription || itemName,
        quoteTimeframe: quoteTimeframe || '未指定',
        consolidatedSpecs,
        aiEstimatedPrice,
        costBreakdown,
        aiInsights
      };

      const result = await actions.handleGenericChatAction(
        overallChatMessages,
        userMessage,
        context,
        `你是一位資深的整體採購專家。協助處理整體購案分析。`
      );

      const data = result.data || {};
      setOverallChatMessages(prev => [...prev, { role: 'model', text: result.text || data.reply || '抱歉，我現在無法回答。' }]);

      if (data.shouldUpdateSpecs && data.newSpecs) {
        setSupplementarySpecs(prev => {
          const newSpecs = [...prev];
          if (newSpecs[newSpecs.length - 1] === '') {
            newSpecs[newSpecs.length - 1] = data.newSpecs;
          } else {
            newSpecs.push(data.newSpecs);
          }
          return newSpecs;
        });
        setIsSpecsConfirmed(false);
        setShowSpecSummary(false);
      }
      if (data.shouldReestimate) {
        runAiAnalysis();
      }
    } catch (error: unknown) {
      console.error('Overall Chat Error:', error);
      let errorMessage = '通訊發生錯誤。';
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota')) {
        errorMessage = 'API 請求次數已達上限。';
      }
      setOverallChatMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsOverallChatLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeCostItem) return;
    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const context = {
        itemName: confirmedItemDescription || itemName,
        activeCostItem,
        quoteTimeframe: quoteTimeframe || '未指定'
      };

      const result = await actions.handleGenericChatAction(
        chatMessages,
        userMessage,
        context,
        `你是一位資深的採購專家。請協助回答採購相關問題。`
      );

      setChatMessages(prev => [...prev, { role: 'model', text: result.text || '抱歉，我現在無法回答。' }]);
      if (result.data?.shouldUpdate && result.data?.updatedCost !== undefined) {
        const index = costBreakdown.findIndex(item => item.item === activeCostItem.item);
        if (index !== -1) {
          setCostBreakdown(prev => {
            const newBreakdown = [...prev];
            newBreakdown[index] = {
              ...newBreakdown[index],
              cost: result.data.updatedCost,
              basis: result.data.updatedBasis || newBreakdown[index].basis,
              explanation: result.data.updatedExplanation || newBreakdown[index].explanation
            };
            const newTotal = newBreakdown.reduce((sum, item) => sum + item.cost, 0);
            setAiEstimatedPrice(newTotal);
            return newBreakdown;
          });
        }
      }
    } catch (error: unknown) {
      console.error('Chat Error:', error);
      let errorMessage = '通訊發生錯誤。';
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota')) {
        errorMessage = 'API 請求次數已達上限。';
      }
      setChatMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return { 
    NegotiationForm, aggregatePhase3Data, alignCostStructures, buildProjectSnapshot, 
    cancelEditing, exportHistoryAsExcel, fetchAlternatives, fetchRecommendedVendors, 
    fileToBase64, generateCostJustification, generatePhase2AnalysisForItem, 
    generatePhase2NegotiationStrategy, getCommittedPrice, getCurrentOrLatestProject, 
    getHistoricalLearningContext, handleAddSpec, handleClearAll, handleCompareDiff, 
    handleConditionChange, handleConsolidateSpecs, handleDeleteHistoryEntry, 
    handleImportHistoryFile, handleOpenChat, handlePhase2ChatMessage, 
    handleRemoveSpec, handleRemoveVendor, handleAddVendor, handleVendorChange,
    handleScreenshot, handleSectionScreenshot, handleSelectPhase2AnalysisItem, 
    handleBatchGeneratePhase2Analysis,
    handleSendItemChatMessage, handleSendMessage, handleSendOverallChatMessage, 
    handleSetAdopted, handleSpecChange, handleStartItemClarification, 
    handleTogglePhase3Merge, handleUpdateCostItem, handleVendorQuotePdfSelected, 
    loadProject, normalizeImportedProject, parseJsonCell, parseVendorQuotePdfWithGemini, 
    regenerateAllPhase3Justifications, regenerateNegotiationStrategy, 
    runAiAnalysis, saveCurrentProject, saveEditing, saveNegotiationRecord, 
    startEditing, toggleNegotiationForm, updateRowGrouping 
  };
}
