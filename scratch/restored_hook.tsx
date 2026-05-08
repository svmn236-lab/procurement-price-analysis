import React, { useState, useRef, useMemo, useCallback } from "react";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { MessageSquare } from "lucide-react";
import { 
  Vendor, CostItem, ConsolidatedSpec, CostHistoryEntry, 
  AlternativeProduct, RecommendedVendor, Phase2State, Phase2AlignedRow, 
  NegotiationRecord, SavedProject, HistoryExcelRow, Phase3State
} from "@/types/procurement";
import { INITIAL_VENDORS, extractJsonArrayFromText } from "@/lib/constants";
import * as actions from "@/actions/aiActions";

export function useProcurementHandlers(states: any, calculations: any) {
const { 
    activeTab, setActiveTab, strategy, setStrategy, itemName, setItemName, isItemModalOpen, setIsItemModalOpen, itemChatMessages, setItemChatMessages, itemChatInput, setItemChatInput, isItemChatLoading, setIsItemChatLoading, proposedItemDescription, setProposedItemDescription, confirmedItemDescription, setConfirmedItemDescription, projectName, setProjectName, showProjectDetails, setShowProjectDetails, showProcurementInputs, setShowProcurementInputs, docNumber, setDocNumber, department, setDepartment, section, setSection, applicant, setApplicant, budgetAmount, setBudgetAmount, handlingSection, setHandlingSection, handler, setHandler, totalQty, setTotalQty, vendors, setVendors, aiInsights, setAiInsights, isAnalyzing, setIsAnalyzing, specFile, setSpecFile, aiEstimatedPrice, setAiEstimatedPrice, costBreakdown, setCostBreakdown, showBreakdown, setShowBreakdown, showAiInsights, setShowAiInsights, supplementarySpecs, setSupplementarySpecs, quoteTimeframe, setQuoteTimeframe, consolidatedSpecs, setConsolidatedSpecs, isConsolidating, setIsConsolidating, showSpecSummary, setShowSpecSummary, isSpecsConfirmed, setIsSpecsConfirmed, consolidationError, setConsolidationError, editingSpecIndex, setEditingSpecIndex, editingContent, setEditingContent, activeChatId, setActiveChatId, chatMessages, setChatMessages, chatInput, setChatInput, isChatLoading, setIsChatLoading, overallChatMessages, setOverallChatMessages, overallChatInput, setOverallChatInput, isOverallChatLoading, setIsOverallChatLoading, showOverallChat, setShowOverallChat, costHistory, setCostHistory, showDiffModal, setShowDiffModal, expandedDiffId, setExpandedDiffId, diffExplanations, setDiffExplanations, showVendorSection, setShowVendorSection, savedProjects, setSavedProjects, showSavedProjectsModal, setShowSavedProjectsModal, currentProjectId, setCurrentProjectId, historyFeedback, setHistoryFeedback, alternatives, setAlternatives, showAlternativesModal, setShowAlternativesModal, isFetchingAlternatives, setIsFetchingAlternatives, recommendedVendors, setRecommendedVendors, showRecommendedVendorsModal, setShowRecommendedVendorsModal, isFetchingRecommendedVendors, setIsFetchingRecommendedVendors, phase2, setPhase2, phase2Error, setPhase2Error, isPhase2Parsing, setIsPhase2Parsing, isPhase2Aligning, setIsPhase2Aligning, isPhase2Negotiating, setIsPhase2Negotiating, selectedAnalysisItem, setSelectedAnalysisItem, phase2AnalysisError, setPhase2AnalysisError, isPhase2AnalysisLoading, setIsPhase2AnalysisLoading, phase3, setPhase3, expandedNegotiationItems, setExpandedNegotiationItems, isPhase2ChatLoading, setIsPhase2ChatLoading, phase2ChatInput, setPhase2ChatInput, vendorPdfInputRef, appRef, confirmedItemRef, aiInsightsRef, historyImportRef 
  } = states;
  const { 
    activeCostItem, stats, chartData 
  } = calculations;

  // Ë≠∞ÂÉπË°®ÂñÆÁµÑ‰ª∂ (?ßÈÉ®ÂÆöÁæ©?ñÊê¨ÁßªËá≥Ê≠?
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
          {item} - Ë≠∞ÂÉπ?ûÈ?
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Ë≠∞ÂÉπÂæåÈ?È°?/label>
            <input
              type="number"
              step="0.01"
              value={negotiatedPrice}
              onChange={(e) => setNegotiatedPrice(Number(e.target.value) || 0)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-violet-500 outline-none"
              placeholder="Ëº∏ÂÖ•Ë≠∞ÂÉπÂæåÈ?È°?
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">?•Â??Ä??/label>
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={isAccepted}
                  onChange={() => setIsAccepted(true)}
                  className="text-violet-600"
                />
                <span className="text-sm text-emerald-700 font-medium">?•Â?</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={!isAccepted}
                  onChange={() => setIsAccepted(false)}
                  className="text-violet-600"
                />
                <span className="text-sm text-red-700 font-medium">‰∏çÊé•??/span>
              </label>
            </div>
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">?üÂ?Ë™™Ê?</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-violet-500 outline-none resize-none"
              rows={2}
              placeholder={isAccepted ? "?∫‰?È∫ºÊé•?óÈÄôÂÄãÂÉπ?ºÔ?" : "?∫‰?È∫º‰??•Â?ÔºüÂ??ÜÁ??çÊ??Ø‰?È∫ºÔ?"}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            ?ñÊ?
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            ?≤Â?Ë≠∞ÂÉπË®òÈ?
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
  const handleVendorChange = (id: string, field: keyof Vendor, value: string | number) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };


  const buildProjectSnapshot = (projectId: string, desc?: string, overrides?: Partial<SavedProject>): SavedProject => ({
    id: projectId,
    timestamp: Date.now(),
    projectName: projectName || '?™ÂëΩ?çË≥ºÊ°?,
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
          .join(' | ') || '??;

      return {
        ?ØÂá∫?àÊú¨: 'xlsx-v2',
        ?ØÂá∫?ÇÈ?: new Date().toISOString(),
        Â∞àÊ?ID: project.id,
        ?•Ê?: new Date(project.timestamp).toISOString(),
        Â∞àÊ??çÁ®±: project.projectName,
        ?ÅÈ??çÁ®±: project.itemName,
        Á¢∫Ë??ÅÈ??èËø∞: project.confirmedItemDescription,
        ?°Ë≥ºÁ∏ΩÈ?: project.totalQty,
        ?êÁ??ëÈ?: project.budgetAmount,
        ?±ÂÉπ?Ä?? project.quoteTimeframe,
        AI‰º∞Á??ÆÂÉπ: project.aiEstimatedPrice,
        AI?ÜÊ?ÁµêÊ?: project.aiInsights,
        ?°Ë≥ºÁ≠ñÁï•: strategy,
        Âª†Â??±ÂÉπJSON: JSON.stringify(project.vendors || []),
        ?êÊú¨?ÜÈ?JSON: JSON.stringify(project.costBreakdown || []),
        Ê≠∑Âè≤‰º∞Á?JSON: JSON.stringify(project.costHistory || []),
        Ë£úÂ?Ë¶èÊ†ºJSON: JSON.stringify(project.supplementarySpecs || []),
        ÂΩôÁ∏ΩË¶èÊ†ºJSON: JSON.stringify(project.consolidatedSpecs || []),
        ?¥È?Â∞çË©±JSON: JSON.stringify(project.overallChatMessages || []),
        ?ø‰ª£?πÊ?JSON: JSON.stringify(project.alternatives || []),
        ?®Ëñ¶Âª†Â?JSON: JSON.stringify(project.recommendedVendors || []),
        ?á‰ª∂Á∑®Ë?: project.docNumber || '',
        ?®È?: project.department || '',
        ÁßëÂà•: project.section || '',
        ?≥Ë?‰∫? project.applicant || '',
        ?øËæ¶Áß? project.handlingSection || '',
        ?øËæ¶‰∫? project.handler || '',
        Ë¶èÊ†ºÂ∑≤Á¢∫Ë™? project.isSpecsConfirmed,
        Á¨¨‰??éÊÆµJSON: JSON.stringify(project.phase2 ?? null),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
    XLSX.writeFile(workbook, `procurement-history-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setHistoryFeedback(`Â∑≤ÂåØ??${mergedProjects.length} Á≠ÜÁ??Ñ`);
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

    const requiredFields = ['Â∞àÊ?ID', '?•Ê?', 'Â∞àÊ??çÁ®±', 'Âª†Â??±ÂÉπJSON', '?êÊú¨?ÜÈ?JSON'];
    const hasRequired = requiredFields.every(field => Object.prototype.hasOwnProperty.call(raw, field));
    if (!hasRequired) return null;

    const vendors = parseJsonCell<Vendor[]>(raw['Âª†Â??±ÂÉπJSON'], []);
    const costBreakdownImported = parseJsonCell<CostItem[]>(raw['?êÊú¨?ÜÈ?JSON'], []);
    const costHistoryImported = parseJsonCell<CostHistoryEntry[]>(raw['Ê≠∑Âè≤‰º∞Á?JSON'], []);
    const supplementarySpecsImported = parseJsonCell<string[]>(raw['Ë£úÂ?Ë¶èÊ†ºJSON'], ['']);
    const consolidatedSpecsImported = parseJsonCell<ConsolidatedSpec[]>(raw['ÂΩôÁ∏ΩË¶èÊ†ºJSON'], []);
    const overallChatMessagesImported = parseJsonCell<{ role: 'user' | 'model', text: string }[]>(raw['?¥È?Â∞çË©±JSON'], []);
    const alternativesImported = parseJsonCell<AlternativeProduct[]>(raw['?ø‰ª£?πÊ?JSON'], []);
    const recommendedVendorsImported = parseJsonCell<RecommendedVendor[]>(raw['?®Ëñ¶Âª†Â?JSON'], []);
    const phase2Raw = raw['Á¨¨‰??éÊÆµJSON'];
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

    const totalQtyRaw = raw['?°Ë≥ºÁ∏ΩÈ?'];
    const budgetRaw = raw['?êÁ??ëÈ?'];
    const aiPriceRaw = raw['AI‰º∞Á??ÆÂÉπ'];

    const timestamp = Date.parse(String(raw['?•Ê?'] || ''));

    return {
      id: String(raw['Â∞àÊ?ID'] || `${Date.now()}-${index}`),
      timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp,
      projectName: String(raw['Â∞àÊ??çÁ®±'] || '?™ÂëΩ?çË≥ºÊ°?),
      itemName: String(raw['?ÅÈ??çÁ®±'] || ''),
      docNumber: String(raw['?á‰ª∂Á∑®Ë?'] || ''),
      department: String(raw['?®È?'] || ''),
      section: String(raw['ÁßëÂà•'] || ''),
      applicant: String(raw['?≥Ë?‰∫?] || ''),
      budgetAmount: budgetRaw === '' || budgetRaw === undefined || budgetRaw === null ? '' : Number(budgetRaw || 0),
      handlingSection: String(raw['?øËæ¶Áß?] || ''),
      handler: String(raw['?øËæ¶‰∫?] || ''),
      totalQty: totalQtyRaw === '' || totalQtyRaw === undefined || totalQtyRaw === null ? '' : Number(totalQtyRaw || 0),
      vendors,
      supplementarySpecs: Array.isArray(supplementarySpecsImported) ? supplementarySpecsImported : [''],
      consolidatedSpecs: Array.isArray(consolidatedSpecsImported) ? consolidatedSpecsImported : [],
      isSpecsConfirmed: Boolean(raw['Ë¶èÊ†ºÂ∑≤Á¢∫Ë™?]),
      confirmedItemDescription: String(raw['Á¢∫Ë??ÅÈ??èËø∞'] || ''),
      quoteTimeframe: String(raw['?±ÂÉπ?Ä??] || ''),
      aiInsights: String(raw['AI?ÜÊ?ÁµêÊ?'] || ''),
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
        setHistoryFeedback('?ØÂÖ•Â§±Ê?ÔºöÊâæ‰∏çÂà∞Â∑•‰?Ë°?);
        return;
      }

      const rawProjects = XLSX.utils.sheet_to_json<Record<string, unknown>>(historySheet, { defval: '' });
      if (rawProjects.length === 0) {
        setHistoryFeedback('?ØÂÖ•Â§±Ê?ÔºöExcel ?ßÂÆπ?∫Á©∫');
        return;
      }

      // ?≤Â?Ê™¢Êü•ÔºöËá≥Â∞ëÈ?Ë¶ÅÈÄô‰?Ê¨Ñ‰?ÔºåÈÅø?çÂåØ?•ÈåØË™§Ê†ºÂºèÊ?Ê°?
      const requiredColumns = ['Â∞àÊ?ID', '?•Ê?', 'Â∞àÊ??çÁ®±', 'Âª†Â??±ÂÉπJSON', '?êÊú¨?ÜÈ?JSON'];
      const firstRow = rawProjects[0];
      const missingColumns = requiredColumns.filter(col => !Object.prototype.hasOwnProperty.call(firstRow, col));
      if (missingColumns.length > 0) {
        setHistoryFeedback(`?ØÂÖ•Â§±Ê?ÔºöÁº∫Â∞ëÂ?Ë¶ÅÊ?‰Ω?${missingColumns.join('??)}`);
        return;
      }

      const normalized = rawProjects
        .map((p: Record<string, unknown>, idx: number) => normalizeImportedProject(p, idx))
        .filter((p: SavedProject | null): p is SavedProject => Boolean(p))
        .sort((a: SavedProject, b: SavedProject) => b.timestamp - a.timestamp);

      if (normalized.length === 0) {
        setHistoryFeedback('?ØÂÖ•Â§±Ê?ÔºöExcel ?ºÂ?‰∏çÁ¨¶?ñË??ôÁÑ°Ê≥ïËß£??);
        return;
      }

      setSavedProjects(normalized.slice(0, 50));
      const toLoad = normalized[0];
      loadProject(toLoad);
      setHistoryFeedback(`Â∑≤ÂåØ??${normalized.length} Á≠ÜÁ??Ñ‰∏¶ËºâÂÖ•??{toLoad.projectName}?ç`);
    } catch (error) {
      console.error('Import History Error:', error);
      setHistoryFeedback('?ØÂÖ•Â§±Ê?ÔºöË?Á¢∫Ë? .xlsx ?ºÂ??ØÂê¶Ê≠?¢∫');
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
        `Ê°à‰? ${idx + 1}Ôº?{p.projectName}Ôº?{new Date(p.timestamp).toLocaleDateString()}Ôºâ`,
        `?ÅÈ?Ôº?{p.confirmedItemDescription || p.itemName || '?™Â°´ÂØ?}`,
        `?±ÂÉπ?Ä?ìÔ?${p.quoteTimeframe || '?™Ê?ÂÆ?}`,
        `Ë´áÂà§/È¢®Èö™?çÈ?Ôº?{p.aiInsights || '??}`,
        `?êÂ??§Êñ∑?áË≠∞?πÈ?ËºØÊ?Ë¶ÅÔ?\n${keyBreakdown || '??}`
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
          // Find the cloned app container
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
      link.download = `?°Ë≥º?ºÂ?Ê±∫Á?ËºîÂä©Á≥ªÁµ±_${new Date().getTime()}.png`;
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
        [oldEntry.id]: { loading: false, text: response.text || '?°Ê??¢Á?Â∑ÆÁï∞?ÜÊ??? } 
      }));
    } catch (error) {
      console.error('Diff Analysis Error:', error);
      setDiffExplanations(prev => ({ 
        ...prev, 
        [oldEntry.id]: { loading: false, text: '?¢Á?Â∑ÆÁï∞?ÜÊ??ÇÁôº?üÈåØË™§Ô?Ë´ãÁ?ÂæåÂ?Ë©¶„Ä? } 
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

    // Re-extract total quantity if specs change
    try {
      const specsText = newSpecs.map(s => `[${s.category}] ${s.content}`).join('\n');
      
      const data = JSON.parse(response.text || '{}');
      if (data.totalQuantity && data.totalQuantity > 0) {
        setTotalQty(data.totalQuantity);
      }
    } catch (error) {
      console.error("Failed to extract quantity from edited specs:", error);
    }
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
        setConsolidationError('API Ë´ãÊ?Ê¨°Êï∏Â∑≤È?‰∏äÈ? (Quota Exceeded)?ÇË?Á®çÂ??çË©¶ÔºåÊ?Ê™¢Êü•?®Á? API Key È°çÂ∫¶??);
      } else {
        setConsolidationError('Ë¶èÊ†º?ÜÊ?Â§±Ê?ÔºåË?Ê™¢Êü•Á∂≤Ë∑Ø?????API Key Ë®≠ÁΩÆ??);
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
      const fetchedVendors = await actions.fetchRecommendedVendorsAction(confirmedItemDescription || itemName);  const generatePhase2NegotiationStrategy = async (
    aligned: Phase2AlignedRow[],
    negotiationRecords: NegotiationRecord[] = []
  ): Promise<string> => {
    return await actions.generatePhase2NegotiationStrategyAction(aligned, negotiationRecords);
  };
çÁ¨¨‰∫åÈ?ÊÆµ„ÄåÂ???PDF ?±ÂÉπ vs AI ?àÁ??ê‰º∞?çÁ?Â∑ÆÁï∞?ÜÊ?ÔºàJSONÔºâÔ?
${JSON.stringify(aligned, null, 2)}

${hasNegotiationFeedback ? `
?ê‰Ωø?®ËÄÖË≠∞?πÂ?È•ãÁ??Ñ„ÄëÔ?
${JSON.stringify(negotiationRecords, null, 2)}

Â∑≤Êé•?óÈ??ÆÔ?${acceptedItems.length > 0 ? acceptedItems.map(r => `${r.item} (Ë≠∞ÂÉπÂæ? $${r.negotiatedPrice})`).join('??) : '??}
?íÁ??ÖÁõÆ?äÂ??†Ô?${rejectedItems.length > 0 ? rejectedItems.map(r => `${r.item} (?üÂ?: ${r.reason})`).join('Ôº?) : '??}
` : ''}

Ë´ã‰ª•ÁπÅÈ?‰∏≠Ê??ÅMarkdown ?ºÂ??∞ÂØ´??{hasNegotiationFeedback ? 'Á¨¨‰?Ëº™ÈÄ≤È?Ë´áÂà§Á≠ñÁï•' : '?ùÂ??ßË??§Á???}?çÔ?ÂøÖÈ??∑È??ÖÂê´Ôº?

${hasNegotiationFeedback ? `
1. **Á¨¨‰?Ëº™Ë≠∞?πÁ??úÂ???*ÔºöÁ∏ΩÁµê‰Ωø?®ËÄÖË≠∞?πÊ??úÔ?Ë®àÁ?Á∏ΩÈ??πÂ?Â∫¶„Ä?
2. **?ùÂ??íÁ??ÖÁõÆ?ÑÁ¨¨‰∫åËº™?ªÈò≤**ÔºöÈ?Â∞çÂ??ÜÊ?ÁµïÈ??πÁ??ÖÁõÆÔºåÊ?‰æõÊõ¥Ê∑±ÂÖ•?ÑË??§Á??•Ë??ø‰ª£?πÊ???
3. **?∞Ë??§Ë©±Ë°ìÂª∫Ë≠?*ÔºöÊ†π?öÂ??ÜÁ??çÊ?ÔºåÊ?‰æõÊõ¥Á≤æÊ??ÑÁ¨¨‰∫åËº™ÊÆ∫ÂÉπË™™Ê???
4. **È¢®Èö™?çÊñ∞Ë©ï‰º∞**ÔºöÊ†π?öË≠∞?πÁ??úÔ??çÊñ∞Ë©ï‰º∞ÊΩõÂú®È¢®Èö™?áÈö±?èÊ??¨„Ä?
` : `
1. **?åÊ∞¥?Ä?¥È??ÑÁ¥∞??*ÔºöÊ??∫Â??ÜÂú®?™ÂÄãÊ??¨Á¥∞?ÖÂà©ÊΩ§Â?È´òÊ??åÊ∞¥?Ä?¥È?ÔºàÈ??∏Â?‰æùÊ?Ôºâ„Ä?
2. **?ªÈò≤Ë©±Ë?Âª∫Ë≠∞**ÔºöÈ?Â∞çÁï∞Â∏∏È??ÆÁµ¶?∫ÂèØ?¥Êé•‰ΩøÁî®?ÑÊÆ∫?πË™™Ê≥ïÔ?Ê¢ùÂ?Ôºâ„Ä?
3. **È¢®Èö™?áÈö±?èÊ???*ÔºöÊ??íÂèØ?ΩÈÅ∫ÊºèÁ?Ë≤ªÁî®?ÅË??ºÈô∑?±Ê??àÁ?È¢®Èö™??
`}

Ë™ûÊ∞£Â∞àÊ•≠?ÅÂèØ?¥Êé•Â∞çÂÖß?®Á∞°?±‰Ωø?®„ÄÇ`;

    const response = await ai.models.generateContent({
      model: GEMINI_PHASE2_TEXT_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    return (response.text || '').trim() || 'ÔºàÊú™?ΩÁî¢?üË??§Á??•Ô?Ë´ãÁ?ÂæåÈ?Ë©¶Ô?';
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
        quoteTimeframe: quoteTimeframe || '?™Ê?ÂÆ?,
      };

      const systemPrompt = `‰Ω†ÊòØ‰∏Ä‰ΩçÂ?Ê•≠Á??°Ë≥ºË≠∞ÂÉπÈ°ßÂ??ÇÁõÆ?çÊ≠£?®Ë?Ë´ñË≥ºÊ°à„Ä?{confirmedItemDescription || itemName}?çÁ?Âª†Â??±ÂÉπ?ÜÊ???

?∂Â?Â∑ÆÁï∞?ÜÊ??∏Ê?Ôº?
${JSON.stringify(contextData, null, 2)}

Ê≠∑Âè≤Â∞çË©±Ôº?
${phase2.phase2ChatMessages?.map(m => `${m.role === 'user' ? '‰ΩøÁî®?? : 'AI'}: ${m.text}`).join('\n') || '??}
‰ΩøÁî®?ÖÂ?È°åÔ?${userMessage}

Ë´ãÊ†π?öÁï∂?çÁ??±ÂÉπÂ∑ÆÁï∞?∏Ê??åË≠∞?πË??ÑÔ?Â∞àÊ•≠?ûÁ?‰ΩøÁî®?ÖÁ??èÈ??ÇË??ê‰??∑È??ÑÂ??¥Ê?ÂØü„ÄÅË≠∞?πÂª∫Ë≠∞Ê??êÊú¨?ÜÊ???

Ë´ã‰ª•ÁπÅÈ?‰∏≠Ê??ûÁ?Ôºå‰??ÅÂ?Ê•≠‰?ÂØ¶Áî®?Ç`;

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
      let errorMessage = '?öË??ºÁ??ØË™§ÔºåË?Á®çÂ??çË©¶??;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API Ë´ãÊ?Ê¨°Êï∏Â∑≤È?‰∏äÈ? (Quota Exceeded)?ÇË?Á®çÂ??çË©¶ÔºåÊ?Ê™¢Êü•?®Á? API Key È°çÂ∫¶??;
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
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    const prompt = `
‰Ω†ÊòØ‰∏Ä‰ΩçË?Ê∑±Êé°Ë≥ºË≠∞?πÈ°ß?è„ÄÇË??ùÂ??åÂ??ÜÂ†±??vs AI ?àÁ??ê‰º∞?çÂ∑Æ?∞Â??ê‰∏≠?ÑÂñÆ‰∏Ä?êÊú¨Á¥∞È?ÔºåÁî¢?∫ÂèØ‰æõÊé°Ë≥ºË≠∞?πÁ?Â∞àÊ•≠?ÜÊ???

Ë≥ºÊ?Ôº?{confirmedItemDescription || itemName}
?âÊ??±ÂÉπ?ÇÈ??Ä?ìÔ?${quoteTimeframe || '?™Ê?ÂÆ?}

?ÆÊ?Á¥∞È?Ôº?
${JSON.stringify(row, null, 2)}

Á¨¨‰??éÊÆµ AI ?êÊú¨?ÜÈ?Ôºà‰?‰Ω†Êé®Â∞é‰º∞ÁÆóÈ?ËºØÔ?ÂøÖË??ÇÂèØ?®Ô?Ôº?
${JSON.stringify({ aiEstimatedUnitPrice: aiEstimatedPrice, totalQty, costBreakdown }, null, 2)}

Á¨¨‰??éÊÆµ?∂‰?Â∑ÆÁï∞?ÜÊ??óÔ?‰æõ‰?Â∞çÁÖßÊØî‰??áÂ??ÜÊÄßÔ?Ôº?
${JSON.stringify(currentPhase2.alignedRows, null, 2)}

Ë©≤Á¥∞?ÖÁ?Ë≠∞ÂÉπ?ûÈ?Á¥Ä?ÑÔ??•Ê?ÔºâÔ?
${JSON.stringify((currentPhase2.negotiationRecords || []).filter(r => r.item === row.item), null, 2)}

Ëº∏Âá∫Ë¶ÅÊ?Ôº?
1. categoryÔºöË??πÊ??ÖÁõÆ?ßË≥™?≤Ë??ÜÈ?Ôºà‰?Â¶ÇÔ?Â§ñË≥º‰ª∂Ë≤ª?ÅÂ?Â∑•Ë≤ª?ÅÁÆ°?ÜË≤ª?ÅÈ?Ë≤ª„ÄÅÂà©ÊΩ§Á?Ôºâ„Ä?
2. calculationLogicÔºöË?Ëº∏Âá∫?åÂ??´ÂØ¶?õÊï∏Â≠ó„ÄçÁ??∏Â≠∏ÁÆóÂ??áÈ?ËºØÔ??Ø‰ª•?àÁ??áË®≠?ÆÂÉπ?ÅÂ∑•?Ç„ÄÅËÄóÊ??áÔ?‰ΩÜË?ÂØ´Ê??áË®≠‰æùÊ?ÔºâÔ?ËÆìÊé°Ë≥ºËÉΩ‰∏Ä?ºÁ??Ç‰??éÈ∫ºÁÆóÂá∫ AI ?∫Ê??π„Ä?
3. consultantAnalysisÔºöË?‰ª•Êé°Ë≥ºÈ°ß?èÁ?ËßíÂ∫¶ÔºåÈ?Â∞çË©≤?êÊú¨Á¥∞È??ê‰?‰∏ÄÊÆµÂ??´„ÄåÂ??¥Ë??ÖÊ?ÂØü„ÄçË??åÂÖ∑È´îË≠∞?πÂ??•È??çÁ?Âª∫Ë≠∞?áÂ?ÔºåÂ?ÂøÖÂÖ∑È´î„ÄÅÂèØ?ΩÂú∞ÔºàÂèØ?®Ê??óÔ???
4. Ë´ãÂö¥?º‰ª• JSON ?ûË?Ôºå‰?Ë¶ÅÂ??´ÂÖ∂‰ªñÊ?Â≠ó„Ä?
`;

    const response = await ai.models.generateContent({
      model: GEMINI_PHASE2_TEXT_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            calculationLogic: { type: Type.STRING },
            consultantAnalysis: { type: Type.STRING },
          },
          required: ['category', 'calculationLogic', 'consultantAnalysis'],
        },
      },
    });

    const data = JSON.parse(response.text || '{}') as { category?: unknown; calculationLogic?: unknown; consultantAnalysis?: unknown };
    const category = String(data.category ?? row.category ?? '?™Â?È°?).trim();
    const calculationLogic = String(data.calculationLogic ?? '').trim();
    const consultantAnalysis = String(data.consultantAnalysis ?? '').trim();
    const assistantReply = [
      `### ??{row.item}?ëAI ?∫Ê??πÔ?$${row.aiEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ``,
      `**?ÄÂ±¨Â?È°?*: ${category}`,
      ``,
      `**‰º∞Á??èËºØ**`,
      calculationLogic || 'ÔºàÊú™?ñÂ?‰º∞Á??èËºØÔº?,
      ``,
      `**Â∏ÇÂ†¥Ê¥ûÂ??áÈ°ß?èÂª∫Ë≠?*`,
      consultantAnalysis || 'ÔºàÊú™?ñÂ?Â∏ÇÂ†¥Ê¥ûÂ??áÈ°ß?èÂª∫Ë≠∞Ô?',
    ].join('\n');

  };

  const handleSelectPhase2AnalysisItem = async (row: Phase2AlignedRow) => {
    setSelectedAnalysisItem(row);
    setPhase2AnalysisError(null);
    if (!phase2) return;
    // Removed automatic generation on click to save API quota
  };

  const handleBatchGeneratePhase2Analysis = async () => {
    if (!phase2) return;
    setIsPhase2AnalysisLoading(true);
    setPhase2AnalysisError(null);

    try {
      const itemsToAnalyze = phase2.alignedRows.filter(r => !r.calculationLogic?.trim() || !r.consultantAnalysis?.trim());
      if (itemsToAnalyze.length === 0) {
        setIsPhase2AnalysisLoading(false);
        return;
      }

      const results = await actions.batchGeneratePhase2AnalysisAction(
        itemsToAnalyze,
        confirmedItemDescription || itemName,
        totalQty,
        aiEstimatedPrice,
        costBreakdown,
        quoteTimeframe || '?™Ê?ÂÆ?
      );

      setPhase2(prev => {
        if (!prev) return prev;
        const newRows = prev.alignedRows.map(row => {
          const result = results.find((res: any) => res.item === row.item);
          if (result) {
            return {
              ...row,
              category: result.category || row.category || '?™Â?È°?,
              calculationLogic: result.calculationLogic || row.calculationLogic || '',
              consultantAnalysis: result.consultantAnalysis || row.consultantAnalysis || ''
            };
          }
          return row;
        });

        const newMessages: Phase2State['phase2ChatMessages'] = [
          ...(prev.phase2ChatMessages || []),
          { role: 'user' as const, text: `Ë´ãÊâπÊ¨°Áî¢?∫Ââ©È§?${itemsToAnalyze.length} ?ãÈ??ÆÁ?‰º∞Á??èËºØ?áÂª∫Ë≠∞„ÄÇ` },
          { role: 'assistant' as const, text: `Â∑≤Â???${results.length} ?ãÈ??ÆÁ??πÊ¨°?ÜÊ??Ç` },
        ];

        const updatedPhase2 = { ...prev, alignedRows: newRows, phase2ChatMessages: newMessages };
        saveCurrentProject(undefined, { phase2: updatedPhase2 });
        return updatedPhase2;
      });
    } catch (error: unknown) {
      console.error('Batch analysis error:', error);
      const message = error instanceof Error ? error.message : '';
      let errorMessage = '?πÊ¨°?ÜÊ?Â§±Ê?ÔºåË?Á®çÂ??çË©¶??;
      if (message.includes('429') || message.includes('quota')) {
        errorMessage = 'API Ë´ãÊ?Ê¨°Êï∏?êÂà∂ÔºåË?Á®çÂ??çË©¶??;
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
    // Removed automatic generation on toggle to save API quota
  };

  const aggregatePhase3Data = (p2: Phase2State, isMerged: boolean) => {
    if (!isMerged) {
      // ‰∏çÂ?‰ΩµÊ?ÔºåÊ? groupId ?íÂ?Ôºå‰?‰øùÁ??Ä?âÂñÆ?ãÈ???
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

    // ?à‰ΩµÊ®°Â?ÔºöÊ? groupId ??groupName ?öÂ?
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

    // ??groupId ?íÂ?ËøîÂ?
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

  const handleVendorQuotePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    const isExcel = 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.name.toLowerCase().endsWith('.xls');

    const rowsToVarianceTable = (rows: any[]): Phase2AlignedRow[] => {
      return rows.map(r => {
        const varianceAmount = r.vendorQuote - (r.aiReasonableEstimate || r.aiEstimate || 0);
        const aiEstimate = r.aiReasonableEstimate || r.aiEstimate || 0;
        const variancePercent = aiEstimate !== 0 
          ? (varianceAmount / aiEstimate) * 100 
          : null;
        return {
          category: r.category || '?™Â?È°?,
          item: r.item || '?™Áü•?ÖÁõÆ',
          vendorQuote: r.vendorQuote || 0,
          aiEstimate: aiEstimate,
          calculationLogic: r.calculationLogic || '',
          consultantAnalysis: r.consultantAnalysis || '',
          varianceAmount,
          variancePercent,
          groupId: r.groupId || 0,
          groupName: r.groupName || '?™Â?Áµ?
        };
      });
    };

    if (!isPdf && !isExcel) {
      setPhase2Error('?ÖÊé•??.pdf ??.xlsx ?ºÂ??ÑÂ??ÜÂ†±?πÂñÆ??);
      return;
    }
    if (aiEstimatedPrice === null || costBreakdown.length === 0) {
      setPhase2Error('Ë´ãÂ?ÂÆåÊ?Á¨¨‰??éÊÆµ?åAI Ê®°Êì¨?±ÂÉπ?ç‰∏¶?ñÂ??êÊú¨?ÜÈ?ÂæåÔ??ç‰??≥Â??ÜÂ†±?πÂñÆ??);
      return;
    }

    setPhase2Error(null);
    setIsPhase2Parsing(true);
    setIsPhase2Aligning(false);
    setIsPhase2Negotiating(false);

    try {
      let vendorPdfParsedLines: VendorPdfLineItem[] = [];
      if (isPdf) {
        const base64 = await fileToBase64(file);
        vendorPdfParsedLines = await parseVendorQuotePdfWithGemini(base64);
      } else {
        // Handle Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        
        if (rows.length < 1) throw new Error('Excel Ê™îÊ??ßÂÆπ?∫Á©∫??);

        // Try to find header row
        let headerRowIndex = -1;
        let itemIdx = -1, amountIdx = -1;

        const itemAliases = ['?ÅÈ?', '?ÖÁõÆ', 'Item', 'Name', '?ÖÁõÆ?çÁ®±'];
        const amountAliases = ['?ëÈ?', '?ÆÂÉπ', 'Price', 'Amount', '?±ÂÉπ'];

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;
          
          itemIdx = row.findIndex(cell => itemAliases.some(alias => String(cell).includes(alias)));
          amountIdx = row.findIndex(cell => amountAliases.some(alias => String(cell).includes(alias)));
          
          if (itemIdx !== -1 && amountIdx !== -1) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          // If no headers found, assume first row is data if it has a number in second column
          vendorPdfParsedLines = rows.map(row => {
            if (!Array.isArray(row)) return null;
            return { item: String(row[0] || ''), amount: Number(row[1] || 0) };
          }).filter(line => line && line.item && line.amount > 0) as VendorPdfLineItem[];
        } else {
          // Use found headers
          vendorPdfParsedLines = rows.slice(headerRowIndex + 1).map(row => {
            if (!Array.isArray(row)) return null;
            return { item: String(row[itemIdx] || ''), amount: Number(row[amountIdx] || 0) };
          }).filter(line => line && line.item && line.amount > 0) as VendorPdfLineItem[];
        }

        if (vendorPdfParsedLines.length === 0) {
          throw new Error('?°Ê?Âæ?Excel ‰∏≠Ê??ñÊ??àÁ??ÅÈ??áÈ?È°ç„ÄÇË?Á¢∫‰?Ê™îÊ??ÖÂê´?åÂ??Ö„ÄçË??åÈ?È°ç„ÄçÊ?‰Ωç„Ä?);
        }
      }

      setIsPhase2Parsing(false);
      setIsPhase2Aligning(true);
      const alignRows = await actions.alignCostStructuresAction(
        vendorPdfParsedLines,
        aiEstimatedPrice,
        totalQty,
        confirmedItemDescription || itemName,
        quoteTimeframe || '?™Ê?ÂÆ?,
        costBreakdown,
        aiInsights
      );
      const alignedRows = rowsToVarianceTable(alignRows);

      setIsPhase2Aligning(false);
      setIsPhase2Negotiating(true);

      const negotiationStrategy = await actions.generatePhase2NegotiationStrategyAction(
        alignedRows,
        [],
        confirmedItemDescription || itemName
      );

      const nextPhase2: Phase2State = {
        vendorPdfFileName: file.name,
        vendorPdfParsedLines,
        alignedRows,
        negotiationStrategy,
        negotiationRecords: [], // ?ùÂ??ñË≠∞?πË???
        phase2ChatMessages: [], // ?ùÂ??ñÂ?Â±¨Â?Ë©?
      };
      setPhase2(nextPhase2);
      saveCurrentProject(undefined, { phase2: nextPhase2 });
    } catch (err: unknown) {
      console.error('Phase 2 PDF pipeline error:', err);
      const msg =
        err instanceof Error ? err.message : 'Á¨¨‰??éÊÆµ?ÜÊ?Â§±Ê?ÔºåË?Á¢∫Ë? PDF ?ØË?‰∏?API ?ØÁî®??;
      setPhase2Error(msg);
    } finally {
      setIsPhase2Parsing(false);
      setIsPhase2Aligning(false);
      setIsPhase2Negotiating(false);
    }
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      let specsContext = "";
      if (isSpecsConfirmed && consolidatedSpecs.length > 0) {
        specsContext = "Â∑≤Á¢∫Ë™ç‰??ÄÁµÇË???(Confirmed Specifications):\n" + consolidatedSpecs.map((s, i) => `${i + 1}. [${s.category}] ${s.content}`).join('\n');
      } else {
        const suppSpecsText = supplementarySpecs.filter(s => s.trim()).map((s, i) => `${i + 1}. ${s}`).join('\n');
        specsContext = "Ë£úÂ?Ë¶èÊ†ºÊ¢ù‰ª∂ (Supplementary Specifications):\n" + (suppSpecsText || '??);
      }

      const data = await actions.runAiAnalysisAction(
        confirmedItemDescription || itemName,
        totalQty,
        vendors.filter(v => v.price > 0),
        specsContext,
        quoteTimeframe || '?™Ê?ÂÆ?,
        getHistoricalLearningContext()
      );
      
      setAiInsights(data.insights || "?°Â??êÂª∫Ë≠?);
      setAiEstimatedPrice(data.estimatedPrice || stats.minPrice * 0.95); // ?•Ê??¢Âá∫ÔºåÈ?Ë®≠Ê?‰ΩéÊ???5??
      setCostBreakdown(data.breakdown || []);
      setPhase2(null);
      setPhase2Error(null);

      // Save to history
      const newEntry: CostHistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        totalPrice: data.estimatedPrice || stats.minPrice * 0.95,
        breakdown: data.breakdown || [],
        aiInsights: data.insights || "?°Â??êÂª∫Ë≠?
      };
      
      setCostHistory(prev => {
        const newHistory = [newEntry, ...prev].slice(0, 5);
        
        // Save project with the new data
        saveCurrentProject(undefined, {
          aiInsights: data.insights || "?°Â??êÂª∫Ë≠?,
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
      let errorMessage = '?ÜÊ??éÁ?‰∏≠Áôº?üÈåØË™§Ô?Ë´ãÊ™¢?•Á∂≤Ë∑ØÈÄ????API Key Ë®≠ÁΩÆ??;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API Ë´ãÊ?Ê¨°Êï∏Â∑≤È?‰∏äÈ? (Quota Exceeded)?ÇË?Á®çÂ??çË©¶ÔºåÊ?Ê™¢Êü•?®Á? API Key È°çÂ∫¶??;
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
        text: `?®Â•ΩÔºÅÊ??ØÊÇ®?ÑÊé°Ë≥?AI ?©Ê??ÇÈ??º„Ä?{item.item}?çÁ?Ë®àÁ??∫Á?Ôº?{item.basis}ÔºâÔ??®Ê?‰ªª‰??ëÂ??éÔ??ëÂèØ‰ª•ÁÇ∫?®Ë©≥Á¥∞Ë™™?éÂÖ∂Â∏ÇÂ†¥Ë°åÊ??ÅË?ÁÆóÈ?ËºØÊ?ÊΩõÂú®?ÑË≠∞?πÁ©∫?ì„ÄÇ` 
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
        quoteTimeframe: quoteTimeframe || '?™Ê?ÂÆ?
      };

      const result = await actions.handleGenericChatAction(
        [],
        `Ë´ãÊ†π?öÊñ∞Ê¢ù‰ª∂?çÊñ∞‰º∞Á??êÊú¨Ôº?{itemToUpdate.customCondition}`,
        context,
        `‰Ω†ÊòØ‰∏Ä‰ΩçË?Ê∑±Êé°Ë≥ºÂ?ÂÆ∂„ÄÇË??çÊñ∞‰º∞Á??áÂ??ÖÁõÆ?ÑÊ??¨„ÄÇ`
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
        
        // Recalculate total AI estimated price
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
    setItemChatMessages([{ role: 'ai', text: '?®Â•ΩÔºÅÊ??ØÊÇ®?ÑÊé°Ë≥ºÂä©?ã„ÄÇÁÇ∫‰∫ÜÂπ´?®ÈÄ≤Ë??¥Á≤æÊ∫ñÁ??πÊ†º?ÜÊ?ÔºåÊ??ÄË¶ÅÈ?Ê∏Ö‰?‰∫õÁ¥∞ÁØÄ?ÇË??èÊÇ®?≥Ë??°Ë≥º?ÑÂ??ÖÂÖ∑È´îÁî®?îÊ?Ë¶èÊ†º?Ø‰?È∫ºÔ?' }]);
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
        `‰Ω†ÊòØ‰∏Ä‰ΩçÂ?Ê•≠Á??°Ë≥º?©Á??ÇÂ??©È?Ê∏ÖÂ??ÖÁ¥∞ÁØÄ?Ç`
      );

      setItemChatMessages(prev => [...prev, { role: 'ai', text: result.text }]);
      if (result.data?.isComplete && result.data?.itemDescription) {
        setProposedItemDescription(result.data.itemDescription);
      }
    } catch (error) {
      console.error("Error sending item chat message:", error);
    } finally {
      setIsItemChatLoading(false);
    }
  };
    } catch (error) {
      console.error("Error sending item chat message:", error);
      setItemChatMessages(prev => [...prev, { role: 'ai', text: "?±Ê?ÔºåÁ≥ªÁµ±Áôº?üÈåØË™§Ô?Ë´ãÁ?ÂæåÂ?Ë©¶„Ä? }]);
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
        quoteTimeframe: quoteTimeframe || '?™Ê?ÂÆ?,
        consolidatedSpecs,
        aiEstimatedPrice,
        costBreakdown,
        aiInsights
      };

      const result = await actions.handleGenericChatAction(
        overallChatMessages,
        userMessage,
        context,
        `‰Ω†ÊòØ‰∏Ä‰ΩçË?Ê∑±Á??¥È??°Ë≥ºÂ∞àÂÆ∂?ÇÂ??©Ë??ÜÊï¥È´îË≥ºÊ°àÂ??ê„ÄÇ`
      );

      const data = result.data || {};
      setOverallChatMessages(prev => [...prev, { role: 'model', text: result.text || data.reply || '?±Ê?ÔºåÊ??æÂú®?°Ê??ûÁ??? }]);

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
      let errorMessage = '?öË??ºÁ??ØË™§ÔºåË?Á®çÂ??çË©¶??;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API Ë´ãÊ?Ê¨°Êï∏Â∑≤È?‰∏äÈ? (Quota Exceeded)?ÇË?Á®çÂ??çË©¶ÔºåÊ?Ê™¢Êü•?®Á? API Key È°çÂ∫¶??;
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
        quoteTimeframe: quoteTimeframe || '?™Ê?ÂÆ?
      };

      const result = await actions.handleGenericChatAction(
        chatMessages,
        userMessage,
        context,
        `‰Ω†ÊòØ‰∏Ä‰ΩçË?Ê∑±Á??°Ë≥ºÂ∞àÂÆ∂?ÇË??îÂä©?ûÁ??°Ë≥º?∏È??èÈ??Ç`
      );

      setChatMessages(prev => [...prev, { role: 'model', text: result.text || '?±Ê?ÔºåÊ??æÂú®?°Ê??ûÁ??ôÂÄãÂ?È°å„Ä? }]);

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
      let errorMessage = '?öË??ºÁ??ØË™§ÔºåË?Á®çÂ??çË©¶??;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API Ë´ãÊ?Ê¨°Êï∏Â∑≤È?‰∏äÈ? (Quota Exceeded)?ÇË?Á®çÂ??çË©¶ÔºåÊ?Ê™¢Êü•?®Á? API Key È°çÂ∫¶??;
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

