'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingDown, 
  DollarSign, 
  BrainCircuit, 
  AlertTriangle, 
  CheckCircle2,
  Upload,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  LayoutList,
  MessageSquare,
  Send,
  X,
  ArrowLeft,
  Loader2,
  XCircle,
  Edit2,
  Save,
  RefreshCw,
  Bot,
  User,
  Camera,
  GitCompare,
  FolderOpen,
  Download,
  Lightbulb,
  Building2,
  FileSearch,
  Scale
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as XLSX from 'xlsx';

// --- Types (已整合至單一檔案) ---
interface Vendor { id: string; name: string; price: number; }
interface CostItem { category: string; item: string; cost: number; basis: string; explanation: string; customCondition?: string; isUpdating?: boolean; }
interface ConsolidatedSpec { category: string; content: string; source: string; hasContradiction: boolean; warningMessage?: string; rejectedContent?: string; }

interface CostHistoryEntry {
  id: string;
  timestamp: number;
  totalPrice: number;
  breakdown: CostItem[];
  aiInsights: string;
}

interface AlternativeProduct {
  name: string;
  model: string;
  estimatedPrice: number;
  reason: string;
}

interface RecommendedVendor {
  name: string;
  reason: string;
}

/** 廠商 PDF 報價單萃取單列 */
interface VendorPdfLineItem {
  item: string;
  amount: number;
}

/** 單項議價記錄 */
interface NegotiationRecord {
  item: string;
  negotiatedPrice: number;
  isAccepted: boolean;
  reason: string;
  timestamp: number;
}

/** 第二階段：對齊後之差異分析列 */
interface Phase2AlignedRow {
  category: string;
  item: string;
  vendorQuote: number;
  aiEstimate: number;
  calculationLogic: string; // 新增：AI 預估的計算邏輯說明
  consultantAnalysis: string;
  varianceAmount: number;
  variancePercent: number | null;
}

interface Phase2State {
  vendorPdfFileName: string | null;
  vendorPdfParsedLines: VendorPdfLineItem[];
  alignedRows: Phase2AlignedRow[];
  negotiationStrategy: string;
  negotiationRecords: NegotiationRecord[]; // 新增：議價記錄
  phase2ChatMessages: { role: 'user' | 'assistant', text: string }[]; // 新增：專屬對話
}

interface Phase3State {
  isMerged: boolean;
  justifications: Record<string, string>; // key: item name or category name
  isGeneratingJustification: boolean;
}

interface SavedProject {
  id: string;
  timestamp: number;
  projectName: string;
  itemName: string;
  docNumber: string;
  department: string;
  section: string;
  applicant: string;
  budgetAmount: number | '';
  handlingSection: string;
  handler: string;
  totalQty: number | '';
  vendors: Vendor[];
  supplementarySpecs: string[];
  consolidatedSpecs: ConsolidatedSpec[];
  isSpecsConfirmed: boolean;
  confirmedItemDescription: string;
  quoteTimeframe: string;
  aiInsights: string;
  aiEstimatedPrice: number | null;
  costBreakdown: CostItem[];
  costHistory: CostHistoryEntry[];
  overallChatMessages: { role: 'user' | 'model', text: string }[];
  alternatives?: AlternativeProduct[];
  recommendedVendors?: RecommendedVendor[];
  /** 第二階段：PDF 解析、結構對齊、談判策略 */
  phase2?: Phase2State;
  /** 第三階段：主管決策報表 */
  phase3?: Phase3State;
}

interface HistoryExcelRow {
  匯出版本: string;
  匯出時間: string;
  專案ID: string;
  日期: string;
  專案名稱: string;
  品項名稱: string;
  確認品項描述: string;
  採購總量: number | '';
  預算金額: number | '';
  報價區間: string;
  AI估算單價: number | null;
  AI分析結果: string;
  採購策略: string;
  廠商報價JSON: string;
  成本分項JSON: string;
  歷史估算JSON: string;
  補充規格JSON: string;
  彙總規格JSON: string;
  整體對話JSON: string;
  替代方案JSON: string;
  推薦廠商JSON: string;
  文件編號: string;
  部門: string;
  科別: string;
  申請人: string;
  承辦科: string;
  承辦人: string;
  規格已確認: boolean;
  第二階段JSON: string;
}

const INITIAL_VENDORS: Vendor[] = [
  { id: '1', name: '', price: 0 },
];

/**
 * PDF 視覺萃取（多模態）。使用 `-latest` 別名以利 v1beta 正確解析。
 * `ai.models.generateContent` 的 model 須為純字串（例如 gemini-3-flash-preview），不可加 models/ 前綴。
 */
const GEMINI_PDF_VISION_MODEL = 'gemini-3-flash-preview';
/** 結構對齊與談判策略（與第一階段一致） */
const GEMINI_PHASE2_TEXT_MODEL = 'gemini-3-flash-preview';

function extractJsonArrayFromText(text: string): VendorPdfLineItem[] {
  const raw = text.trim();
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('模型未回傳有效的 JSON 陣列');
  }
  const parsed = JSON.parse(raw.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error('解析結果不是陣列');
  return parsed.map((row: unknown) => {
    if (!row || typeof row !== 'object') return { item: '不明項目', amount: 0 };
    const o = row as Record<string, unknown>;
    const item = String(o.item ?? o.name ?? '未命名');
    const amount = Number(o.amount ?? o.price ?? 0);
    return { item, amount: Number.isFinite(amount) ? amount : 0 };
  });
}

function rowsToVarianceTable(
  rows: { category: string; item: string; vendorQuote: number; aiReasonableEstimate: number; calculationLogic: string; consultantAnalysis: string }[]
): Phase2AlignedRow[] {
  return rows.map((r) => {
    const vendorQuote = r.vendorQuote;
    const aiEstimate = r.aiReasonableEstimate;
    const varianceAmount = vendorQuote - aiEstimate;
    const variancePercent =
      aiEstimate !== 0 && Number.isFinite(aiEstimate)
        ? (varianceAmount / Math.abs(aiEstimate)) * 100
        : null;
    return {
      category: r.category || '未分類',
      item: r.item,
      vendorQuote,
      aiEstimate,
      calculationLogic: r.calculationLogic || '',
      consultantAnalysis: r.consultantAnalysis || '',
      varianceAmount,
      variancePercent,
    };
  });
}

export default function ProcurementCostAnalysis() {
  // 頁籤狀態管理
  const [activeTab, setActiveTab] = useState<'phase1' | 'phase2' | 'phase3'>('phase1');

  const [itemName, setItemName] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemChatMessages, setItemChatMessages] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [itemChatInput, setItemChatInput] = useState('');
  const [isItemChatLoading, setIsItemChatLoading] = useState(false);
  const [proposedItemDescription, setProposedItemDescription] = useState('');
  const [confirmedItemDescription, setConfirmedItemDescription] = useState('');

  // Project Details States
  const [projectName, setProjectName] = useState('');
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showProcurementInputs, setShowProcurementInputs] = useState(true);
  const [docNumber, setDocNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [applicant, setApplicant] = useState('');
  const [budgetAmount, setBudgetAmount] = useState<number | ''>('');
  const [handlingSection, setHandlingSection] = useState('');
  const [handler, setHandler] = useState('');

  const [totalQty, setTotalQty] = useState<number | ''>('');
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [aiEstimatedPrice, setAiEstimatedPrice] = useState<number | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostItem[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);
  
  const [supplementarySpecs, setSupplementarySpecs] = useState<string[]>(['']);
  const [quoteTimeframe, setQuoteTimeframe] = useState<string>('');
  const [showSpecSummary, setShowSpecSummary] = useState(false);
  const [consolidatedSpecs, setConsolidatedSpecs] = useState<ConsolidatedSpec[]>([]);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidationError, setConsolidationError] = useState<string | null>(null);
  const [isSpecsConfirmed, setIsSpecsConfirmed] = useState(false);
  
  const [editingSpecIndex, setEditingSpecIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Chat state
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Overall Chat state
  const [overallChatMessages, setOverallChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [overallChatInput, setOverallChatInput] = useState('');
  const [isOverallChatLoading, setIsOverallChatLoading] = useState(false);
  const [showOverallChat, setShowOverallChat] = useState(true);

  // Cost History & Diff Modal States
  const [costHistory, setCostHistory] = useState<CostHistoryEntry[]>([]);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);
  const [diffExplanations, setDiffExplanations] = useState<Record<string, { loading: boolean, text: string }>>({});

  const [showVendorSection, setShowVendorSection] = useState(true);

  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [showSavedProjectsModal, setShowSavedProjectsModal] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [historyFeedback, setHistoryFeedback] = useState('');

  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [isFetchingAlternatives, setIsFetchingAlternatives] = useState(false);

  const [recommendedVendors, setRecommendedVendors] = useState<RecommendedVendor[]>([]);
  const [showRecommendedVendorsModal, setShowRecommendedVendorsModal] = useState(false);
  const [isFetchingRecommendedVendors, setIsFetchingRecommendedVendors] = useState(false);

  /** 第二階段：廠商 PDF 報價解析、對齊比對、談判策略 */
  const [phase2, setPhase2] = useState<Phase2State | null>(null);
  const [phase2Error, setPhase2Error] = useState<string | null>(null);
  const [isPhase2Parsing, setIsPhase2Parsing] = useState(false);
  const [isPhase2Aligning, setIsPhase2Aligning] = useState(false);
  const [isPhase2Negotiating, setIsPhase2Negotiating] = useState(false);
  const [selectedAnalysisItem, setSelectedAnalysisItem] = useState<Phase2AlignedRow | null>(null);
  const [isPhase2AnalysisLoading, setIsPhase2AnalysisLoading] = useState(false);
  const [phase2AnalysisError, setPhase2AnalysisError] = useState<string | null>(null);

  /** 第三階段：主管決策報表 */
  const [phase3, setPhase3] = useState<Phase3State>({
    isMerged: false,
    justifications: {},
    isGeneratingJustification: false
  });

  // 議價相關狀態
  const [expandedNegotiationItems, setExpandedNegotiationItems] = useState<string[]>([]);
  const [isPhase2ChatLoading, setIsPhase2ChatLoading] = useState(false);
  const [phase2ChatInput, setPhase2ChatInput] = useState('');
  const vendorPdfInputRef = React.useRef<HTMLInputElement>(null);

  const appRef = React.useRef<HTMLDivElement>(null);
  const confirmedItemRef = React.useRef<HTMLDivElement>(null);
  const aiInsightsRef = React.useRef<HTMLDivElement>(null);
  const historyImportRef = React.useRef<HTMLInputElement>(null);

  const activeCostItem = useMemo(() => {
    return costBreakdown.find(item => item.item === activeChatId) || null;
  }, [costBreakdown, activeChatId]);

  // --- 優化點 2: 邊界防護，過濾 0 元報價 ---
  const stats = useMemo(() => {
    const validPrices = vendors.map(v => v.price).filter(p => p > 0);
    
    if (validPrices.length === 0) return { minPrice: 0, maxPrice: 0, variance: 0, totalBudget: 0 };
    
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    const variance = ((maxPrice - minPrice) / minPrice) * 100;
    const totalBudget = minPrice * (Number(totalQty) || 0);
    
    return { minPrice, maxPrice, variance, totalBudget };
  }, [vendors, totalQty]);

  type ChartRow = { id: string; name: string; price: number; type: 'vendor' | 'ai' };
  const chartData = useMemo<ChartRow[]>(() => {
    const data: ChartRow[] = vendors.map(v => ({ id: v.id, name: v.name, price: v.price, type: 'vendor' }));
    if (aiEstimatedPrice !== null) {
      data.push({ id: 'ai-estimate', name: 'AI 估算報價', price: aiEstimatedPrice, type: 'ai' });
    }
    return data.sort((a, b) => a.price - b.price);
  }, [vendors, aiEstimatedPrice]);

  // --- 優化點 3: 函數式更新，避免閉包問題與效能浪費 ---
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
      const workbook = XLSX.read(buffer, { type: 'array' });
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

      // 防呆檢查：至少需要這些欄位，避免匯入錯誤格式檔案
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
      link.download = `採購發包決策輔助系統_${new Date().getTime()}.png`;
      link.click();
    } catch (error) {
      console.error("Screenshot failed:", error);
    }
  };

  const handleSectionScreenshot = async (element: HTMLElement | null, fileName: string) => {
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
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
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      const newest = costHistory[0];

      const prompt = `
        你是一位專業的採購分析師。
        請比較採用版本的 AI 成本估算與歷史版本的估算差異，並說明可能的原因。
        
        採用版本總價：${newest.totalPrice}
        採用版本成本分項：${JSON.stringify(newest.breakdown)}
        
        歷史版本總價：${oldEntry.totalPrice}
        歷史版本成本分項：${JSON.stringify(oldEntry.breakdown)}
        
        請務必包含一個名為「一、 成本差異對照表」的 Markdown 表格，表格必須包含以下欄位：
        | 分項名稱 | 歷史版本金額 | 採用版本金額 | 差異金額 | 差異說明 |
        
        接著，請以專業角度說明為何會有這些差異（例如市場波動、估算基準調整等）。
        請使用繁體中文，並以 Markdown 格式排版。
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      setDiffExplanations(prev => ({ 
        ...prev, 
        [oldEntry.id]: { loading: false, text: response.text || '無法產生差異分析。' } 
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

  const handleVendorChange = (id: string, field: keyof Vendor, value: string | number) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
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
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      const specsText = newSpecs.map(s => `[${s.category}] ${s.content}`).join('\n');
      
      const response = await ai.models.generateContent({
        model,
        contents: `請從以下規格中萃取出「採購總數量」。若無明確數量，請回傳 null。\n\n規格內容：\n${specsText}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              totalQuantity: { type: Type.NUMBER, description: "採購總數量" }
            }
          }
        }
      });
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
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [];
      
      if (specFile) {
        const base64Data = await fileToBase64(specFile);
        parts.push({
          inlineData: { data: base64Data, mimeType: specFile.type || 'application/pdf' }
        });
      }
      
      const suppSpecsText = supplementarySpecs.filter(s => s.trim()).map((s, i) => `${i + 1}. ${s}`).join('\n');
      
      parts.push({
        text: `
          你是一位嚴謹的採購稽核專家。請分析提供的發包規格文件（若有附檔）以及下列的「補充規格條件」與「有效報價時間區間」。
          採購品項：${confirmedItemDescription || itemName}
          補充規格條件：${suppSpecsText || '無'}
          有效報價時間區間：${quoteTimeframe || '未指定'}
          
          任務要求：
          1. 讀取並匯出附檔中的規格文字。
          2. 將附檔規格、補充規格與有效報價時間區間進行交叉比對與歸納。請務必將「有效報價時間區間」也列入彙整後的規格項目中。
          3. 若發現兩者之間有矛盾（例如：尺寸不同、材質要求不同、交期不同），必須標示警告。
          4. 遇到矛盾時，請以「較嚴苛、標準較高」的條件作為主要採用規格。
          5. 將無法被採納的較寬鬆規格註記下來。
          6. 請從所有規格中，找出「採購總數量」，並將其獨立輸出。
        `
      });

      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              specs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    content: { type: Type.STRING },
                    source: { type: Type.STRING },
                    hasContradiction: { type: Type.BOOLEAN },
                    warningMessage: { type: Type.STRING },
                    rejectedContent: { type: Type.STRING }
                  },
                  required: ["category", "content", "source", "hasContradiction"]
                }
              },
              totalQuantity: {
                type: Type.NUMBER,
                description: "從規格中萃取出的採購總數量。若無明確數量，請回傳 null 或 0。"
              }
            },
            required: ["specs"]
          }
        }
      });

      const parsedData = JSON.parse(response.text || '{}');
      setConsolidatedSpecs(parsedData.specs || []);
      if (parsedData.totalQuantity && parsedData.totalQuantity > 0) {
        setTotalQty(parsedData.totalQuantity);
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
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const prompt = `
        你是一位專業的採購與供應鏈專家。
        使用者目前正在採購的品項為：「${confirmedItemDescription || itemName}」。
        請推薦 5 個具有成本競爭力、且功能/規格相似的可替代產品與型號。
        
        請以 JSON 格式回傳，格式如下：
        {
          "alternatives": [
            {
              "name": "產品名稱 (廠牌)",
              "model": "具體型號",
              "estimatedPrice": 預估單價 (數字),
              "reason": "推薦原因與成本優勢說明 (簡短扼要)"
            }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const data = JSON.parse(response.text || "{}");
      const fetchedAlternatives = data.alternatives || [];
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
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const prompt = `
        你是一位專業的採購與供應鏈專家。
        使用者目前正在採購的品項為：「${confirmedItemDescription || itemName}」。
        請利用網路搜尋，推薦 3 家台灣當地或全球知名的優質供應商/廠商。
        
        請以 JSON 格式回傳，格式如下：
        {
          "vendors": [
            {
              "name": "廠商名稱",
              "reason": "推薦原因與優勢說明 (簡短扼要)"
            }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        }
      });

      const data = JSON.parse(response.text || "{}");
      const fetchedVendors = data.vendors || [];
      setRecommendedVendors(fetchedVendors);
      saveCurrentProject(undefined, { recommendedVendors: fetchedVendors });
    } catch (error) {
      console.error('Fetch Recommended Vendors Error:', error);
    } finally {
      setIsFetchingRecommendedVendors(false);
    }
  };

  /** 步驟一：Gemini 視覺萃取 PDF 報價細項 */
  const parseVendorQuotePdfWithGemini = async (base64Pdf: string): Promise<VendorPdfLineItem[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: GEMINI_PDF_VISION_MODEL,
      contents: [
        { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
        { text: '請閱讀附件 PDF 並依系統角色指示輸出，不要輸出任何額外說明文字。' },
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: `你是一個專業的採購稽核員。請閱讀這份 PDF 報價單，提取出所有的【成本細項】與對應的【報價金額】。請直接輸出純 JSON 陣列格式，不要包含其他文字，格式範例：[{"item": "加工費", "amount": 1500}, {"item": "原物料", "amount": 3000}]`,
      },
    });
    const text = response.text || '';
    return extractJsonArrayFromText(text);
  };

  /** 步驟二：將第一階段模擬成本依廠商項目分類重新拆解配對 */
  const alignCostStructures = async (
    vendorLines: VendorPdfLineItem[]
  ): Promise<{ item: string; vendorQuote: number; aiReasonableEstimate: number; calculationLogic: string; consultantAnalysis: string }[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    const inputA = JSON.stringify(
      {
        aiEstimatedUnitPrice: aiEstimatedPrice,
        totalQty,
        itemDescription: confirmedItemDescription || itemName,
        quoteTimeframe: quoteTimeframe || '未指定',
        costBreakdown,
        aiInsights: aiInsights?.slice(0, 6000),
      },
      null,
      2
    );
    const inputB = JSON.stringify(vendorLines, null, 2);

    const prompt = `
你是一位採購成本結構分析專家。請將「輸入 A」的 AI 模擬總成本與分項邏輯，強制依照「輸入 B」的廠商報價項目分類進行重新拆解與配對。

輸入 A（第一階段 AI 模擬總成本與分析）：
${inputA}

輸入 B（廠商報價單成本細項與金額）：
${inputB}

任務：
1. 對輸入 B 的每一個成本細項輸出一列。
2. category 必須根據項目性質進行分類（例如：外購件費、加工費、管理費、運費、利潤等）。
3. item 必須與輸入 B 該列的 item 文字完全一致。
4. vendorQuote 必須等於輸入 B 對應項目的 amount（數值）。
5. aiReasonableEstimate 為依輸入 A 整體合理預估，配對到該廠商分類後的 AI 合理金額（可為小數，最終四捨五入至合理精度）。
6. calculationLogic 必須詳細說明 AI 預估金額的計算邏輯，例如："原物料 5kg * 單價 100 + 5% 耗損" 或 "人工費 8小時 * 時薪 150 + 10% 管理費"。
7. consultantAnalysis 請以採購顧問的角度，針對該成本細項提供一段包含「市場行情洞察」與「具體議價切入點」的分析文字（以繁體中文撰寫，避免空泛，要可落地）。

請嚴格以 JSON 格式回覆，不要包含其他文字。
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
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  item: { type: Type.STRING },
                  vendorQuote: { type: Type.NUMBER },
                  aiReasonableEstimate: { type: Type.NUMBER },
                  calculationLogic: { type: Type.STRING },
                  consultantAnalysis: { type: Type.STRING },
                },
                required: ['category', 'item', 'vendorQuote', 'aiReasonableEstimate', 'calculationLogic', 'consultantAnalysis'],
              },
            },
          },
          required: ['rows'],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');
    const rows = Array.isArray(data.rows) ? data.rows : [];
    return rows as { category: string; item: string; vendorQuote: number; aiReasonableEstimate: number; calculationLogic: string; consultantAnalysis: string }[];
  };

  /** 步驟三：依差異分析產出談判策略 */
  const generatePhase2NegotiationStrategy = async (
    aligned: Phase2AlignedRow[],
    negotiationRecords: NegotiationRecord[] = []
  ): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

    const hasNegotiationFeedback = negotiationRecords.length > 0;
    const rejectedItems = negotiationRecords.filter(r => !r.isAccepted);
    const acceptedItems = negotiationRecords.filter(r => r.isAccepted);

    const prompt = `
你是一位資深採購談判顧問。以下為購案「${confirmedItemDescription || itemName}」第二階段「廠商 PDF 報價 vs AI 合理預估」的差異分析（JSON）：
${JSON.stringify(aligned, null, 2)}

${hasNegotiationFeedback ? `
【使用者議價回饋紀錄】：
${JSON.stringify(negotiationRecords, null, 2)}

已接受項目：${acceptedItems.length > 0 ? acceptedItems.map(r => `${r.item} (議價後: $${r.negotiatedPrice})`).join('、') : '無'}
拒絕項目及原因：${rejectedItems.length > 0 ? rejectedItems.map(r => `${r.item} (原因: ${r.reason})`).join('；') : '無'}
` : ''}

請以繁體中文、Markdown 格式撰寫「${hasNegotiationFeedback ? '第二輪進階談判策略' : '針對性談判策略'}」，必須具體包含：

${hasNegotiationFeedback ? `
1. **第一輪議價結果分析**：總結使用者議價成果，計算總降價幅度。
2. **針對拒絕項目的第二輪攻防**：針對廠商拒絕降價的項目，提供更深入的談判策略與替代方案。
3. **新談判話術建議**：根據廠商的反應，提供更精準的第二輪殺價說法。
4. **風險重新評估**：根據議價結果，重新評估潛在風險與隱藏成本。
` : `
1. **灌水最嚴重的細項**：指出廠商在哪個成本細項利潤偏高或灌水最嚴重（附數字依據）。
2. **攻防話術建議**：針對異常項目給出可直接使用的殺價說法（條列）。
3. **風險與隱藏成本**：提醒可能遺漏的費用、規格陷阱或合約風險。
`}

語氣專業、可直接對內部簡報使用。`;

    const response = await ai.models.generateContent({
      model: GEMINI_PHASE2_TEXT_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    return (response.text || '').trim() || '（未能產生談判策略，請稍後重試）';
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

  const handlePhase2ChatMessage = async () => {
    if (!phase2ChatInput.trim() || !phase2) return;

    const userMessage = phase2ChatInput.trim();
    setPhase2ChatInput('');
    setIsPhase2ChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

      const contextData = {
        alignedRows: phase2.alignedRows,
        negotiationRecords: phase2.negotiationRecords || [],
        itemDescription: confirmedItemDescription || itemName,
        quoteTimeframe: quoteTimeframe || '未指定',
      };

      const prompt = `
你是一位專業的採購議價顧問。目前正在討論購案「${confirmedItemDescription || itemName}」的廠商報價分析。

當前差異分析數據：
${JSON.stringify(contextData, null, 2)}

歷史對話：
${phase2.phase2ChatMessages?.map(m => `${m.role === 'user' ? '使用者' : 'AI'}: ${m.text}`).join('\n') || '無'}
使用者問題：${userMessage}

請根據當前的報價差異數據和議價記錄，專業回答使用者的問題。請提供具體的市場洞察、議價建議或成本分析。

請以繁體中文回答，保持專業且實用。`;

      const response = await ai.models.generateContent({
        model: GEMINI_PHASE2_TEXT_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const aiReply = response.text || '抱歉，我現在無法回答這個問題。';

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
  ): Promise<{ calculationLogic: string; consultantAnalysis: string; assistantReply: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    const prompt = `
你是一位資深採購議價顧問。請針對「廠商報價 vs AI 合理預估」差異分析中的單一成本細項，產出可供採購議價的專業分析。

購案：${confirmedItemDescription || itemName}
有效報價時間區間：${quoteTimeframe || '未指定'}

目標細項：
${JSON.stringify(row, null, 2)}

第一階段 AI 成本分項（供你推導估算邏輯，必要時可用）：
${JSON.stringify({ aiEstimatedUnitPrice: aiEstimatedPrice, totalQty, costBreakdown }, null, 2)}

第二階段其他差異分析列（供你對照比例與合理性）：
${JSON.stringify(currentPhase2.alignedRows, null, 2)}

該細項的議價回饋紀錄（若有）：
${JSON.stringify((currentPhase2.negotiationRecords || []).filter(r => r.item === row.item), null, 2)}

輸出要求：
1. category：請根據項目性質進行分類（例如：外購件費、加工費、管理費、運費、利潤等）。
2. calculationLogic：請輸出「包含實際數字」的數學算式與邏輯（可以合理假設單價、工時、耗損率，但要寫明假設依據），讓採購能一眼看懂你怎麼算出 AI 基準價。
3. consultantAnalysis：請以採購顧問的角度，針對該成本細項提供一段包含「市場行情洞察」與「具體議價切入點」的建議文字，務必具體、可落地（可用條列）。
4. 請嚴格以 JSON 回覆，不要包含其他文字。
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
    const category = String(data.category ?? row.category ?? '未分類').trim();
    const calculationLogic = String(data.calculationLogic ?? '').trim();
    const consultantAnalysis = String(data.consultantAnalysis ?? '').trim();
    const assistantReply = [
      `### 【${row.item}】AI 基準價：$${row.aiEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ``,
      `**所屬分類**: ${category}`,
      ``,
      `**估算邏輯**`,
      calculationLogic || '（未取得估算邏輯）',
      ``,
      `**市場洞察與顧問建議**`,
      consultantAnalysis || '（未取得市場洞察與顧問建議）',
    ].join('\n');

    return { category, calculationLogic, consultantAnalysis, assistantReply };
  };

  const handleSelectPhase2AnalysisItem = async (row: Phase2AlignedRow) => {
    setSelectedAnalysisItem(row);
    setPhase2AnalysisError(null);
    if (!phase2) return;

    const needsGenerate =
      !row.calculationLogic?.trim() ||
      !row.consultantAnalysis?.trim();
    if (!needsGenerate) return;

    setIsPhase2AnalysisLoading(true);
    try {
      const result = await generatePhase2AnalysisForItem(row, phase2);

      setPhase2(prev => {
        if (!prev) return prev;
        const alignedRows = prev.alignedRows.map(r => {
          if (r.item !== row.item) return r;
          return {
            ...r,
            category: result.category || r.category || '未分類',
            calculationLogic: result.calculationLogic || r.calculationLogic || '',
            consultantAnalysis: result.consultantAnalysis || r.consultantAnalysis || '',
          };
        });

        const newMessages: Phase2State['phase2ChatMessages'] = [
          ...(prev.phase2ChatMessages || []),
          { role: 'user' as const, text: `請以採購議價顧問角度，針對「${row.item}」產出估算邏輯與市場洞察與議價切入點。` },
          { role: 'assistant' as const, text: result.assistantReply },
        ];

        const updatedPhase2 = { ...prev, alignedRows, phase2ChatMessages: newMessages };
        saveCurrentProject(undefined, { phase2: updatedPhase2 });
        return updatedPhase2;
      });

      setSelectedAnalysisItem(prev => {
        if (!prev || prev.item !== row.item) return prev;
        return {
          ...prev,
          category: result.category || prev.category || '未分類',
          calculationLogic: result.calculationLogic || prev.calculationLogic || '',
          consultantAnalysis: result.consultantAnalysis || prev.consultantAnalysis || '',
        };
      });
    } catch (error: unknown) {
      console.error('Phase2 analysis generate error:', error);
      const message = error instanceof Error ? error.message : '';
      let errorMessage = '分析產生失敗，請稍後重試。';
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API 請求次數已達上限 (Quota Exceeded)。請稍後再試，或檢查您的 API Key 額度。';
      }
      setPhase2AnalysisError(errorMessage);

      setPhase2(prev => {
        if (!prev) return prev;
        const newMessages: Phase2State['phase2ChatMessages'] = [
          ...(prev.phase2ChatMessages || []),
          { role: 'user' as const, text: `請以採購議價顧問角度，針對「${row.item}」產出估算邏輯與市場洞察與議價切入點。` },
          { role: 'assistant' as const, text: errorMessage },
        ];
        const updatedPhase2 = { ...prev, phase2ChatMessages: newMessages };
        saveCurrentProject(undefined, { phase2: updatedPhase2 });
        return updatedPhase2;
      });
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

  /** 步驟四：產出主管決策報表之成本合理性辯護 */
  const generateCostJustification = async (
    targetItems: { category: string; item: string; vendorQuote: number; finalPrice: number }[],
    isMergedMode: boolean
  ) => {
    if (targetItems.length === 0) return;

    setPhase3(prev => ({ ...prev, isGeneratingJustification: true }));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const prompt = `
你現在是一位為企業爭取最佳利益的「採購辯護律師」。
請根據以下的議價結果與市場行情，為目前的「議價後金額」撰寫合理性說明（Justification）。

你的唯一目標是：找出所有有利資訊，證明這個成本是極度合理且具備競爭力的，值得主管核准。
即便某項目降價不多，也要利用「通膨、品質保證、急單配合度、在地化服務、相較零售價的折扣、長期合作穩定性、技術領先優勢」等商業邏輯來捍衛這個價格。

${isMergedMode ? '【宏觀合併模式】：請針對以下「分類合併後的總金額」產出一段總體性、宏觀的合理性辯護說明。' : '【細項模式】：請為每一個細項產出簡潔專業的辯護文字。'}

購案：${confirmedItemDescription || itemName}
資料（JSON）：
${JSON.stringify(targetItems, null, 2)}

輸出要求：
1. 請以 JSON 格式回覆。
2. 格式：{ "justifications": { "項目或分類名稱": "辯護說明文字" } }
3. 字數簡潔、專業、具備說服力，以繁體中文撰寫。
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
              justifications: {
                type: Type.OBJECT,
                additionalProperties: { type: Type.STRING }
              }
            },
            required: ['justifications'],
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      const newJustifications = data.justifications || {};

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
    
    if (!phase2) return;

    // 如果切換合併模式，且該模式下的辯護說明還沒產生，則自動產生
    const aggregated = aggregatePhase3Data(phase2, checked);
    const missingJustification = aggregated.some(item => !phase3.justifications[item.name]);

    if (missingJustification) {
      const targetItems = aggregated.map(a => ({
        category: a.category,
        item: a.name,
        vendorQuote: a.vendorQuote,
        finalPrice: a.finalPrice
      }));
      await generateCostJustification(targetItems, checked);
    }
  };

  const aggregatePhase3Data = (p2: Phase2State, isMerged: boolean) => {
    if (!isMerged) {
      return p2.alignedRows.map(r => ({
        category: r.category,
        name: r.item,
        vendorQuote: r.vendorQuote,
        finalPrice: getCommittedPrice(r.item, r.vendorQuote, p2.negotiationRecords)
      }));
    }

    // 按 Category 合併
    const map = new Map<string, { category: string; vendorQuote: number; finalPrice: number }>();
    p2.alignedRows.forEach(r => {
      const cat = r.category || '未分類';
      const fp = getCommittedPrice(r.item, r.vendorQuote, p2.negotiationRecords);
      const existing = map.get(cat) || { category: cat, vendorQuote: 0, finalPrice: 0 };
      map.set(cat, {
        category: cat,
        vendorQuote: existing.vendorQuote + r.vendorQuote,
        finalPrice: existing.finalPrice + fp
      });
    });

    return Array.from(map.values()).map(v => ({
      category: v.category,
      name: v.category,
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

  const handleVendorQuotePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setPhase2Error('僅接受 .pdf 格式的廠商報價單。');
      return;
    }
    if (aiEstimatedPrice === null || costBreakdown.length === 0) {
      setPhase2Error('請先完成第一階段「AI 模擬報價」並取得成本分項後，再上傳廠商報價 PDF。');
      return;
    }

    setPhase2Error(null);
    setIsPhase2Parsing(true);
    setIsPhase2Aligning(false);
    setIsPhase2Negotiating(false);

    try {
      const base64 = await fileToBase64(file);
      const vendorPdfParsedLines = await parseVendorQuotePdfWithGemini(base64);

      setIsPhase2Parsing(false);
      setIsPhase2Aligning(true);

      const alignRows = await alignCostStructures(vendorPdfParsedLines);
      const alignedRows = rowsToVarianceTable(alignRows);

      setIsPhase2Aligning(false);
      setIsPhase2Negotiating(true);

      const negotiationStrategy = await generatePhase2NegotiationStrategy(alignedRows);

      const nextPhase2: Phase2State = {
        vendorPdfFileName: file.name,
        vendorPdfParsedLines,
        alignedRows,
        negotiationStrategy,
        negotiationRecords: [], // 初始化議價記錄
        phase2ChatMessages: [], // 初始化專屬對話
      };
      setPhase2(nextPhase2);
      saveCurrentProject(undefined, { phase2: nextPhase2 });
    } catch (err: unknown) {
      console.error('Phase 2 PDF pipeline error:', err);
      const msg =
        err instanceof Error ? err.message : '第二階段分析失敗，請確認 PDF 可讀且 API 可用。';
      setPhase2Error(msg);
    } finally {
      setIsPhase2Parsing(false);
      setIsPhase2Aligning(false);
      setIsPhase2Negotiating(false);
    }
  };

  // --- 優化點 1: 強制 JSON 輸出與結構校準 ---
  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      let fileContext = "";
      if (specFile) {
        fileContext = `User has uploaded a specification file: ${specFile.name}. `;
      }

      let specsContext = "";
      if (isSpecsConfirmed && consolidatedSpecs.length > 0) {
        specsContext = "已確認之最終規格 (Confirmed Specifications):\n" + consolidatedSpecs.map((s, i) => `${i + 1}. [${s.category}] ${s.content}`).join('\n');
      } else {
        const suppSpecsText = supplementarySpecs.filter(s => s.trim()).map((s, i) => `${i + 1}. ${s}`).join('\n');
        specsContext = "補充規格條件 (Supplementary Specifications):\n" + (suppSpecsText || '無');
      }

      const prompt = `
        You are a professional procurement consultant. Analyze the following sourcing data and provide negotiation strategies and risk warnings in Traditional Chinese (zh-TW).
        
        Item: ${confirmedItemDescription || itemName}
        ${(!isSpecsConfirmed && fileContext) ? fileContext : ''}
        ${specsContext}
        Total Quantity: ${totalQty}
        Valid Quote Timeframe: ${quoteTimeframe || '未指定'}
        Vendors and Quotes: ${vendors.filter(v => v.price > 0).map(v => `- ${v.name}: $${v.price}`).join(', ')}
        
        CRITICAL INSTRUCTION:
        When estimating the cost breakdown and the estimated market price, you MUST base your calculations strictly on the "Total Quantity" (${totalQty}), the specifications provided above, and reflect the market conditions for the "Valid Quote Timeframe" (${quoteTimeframe || '未指定'}).
        ${getHistoricalLearningContext()}
        
        Please provide your analysis strictly in JSON format matching the response schema.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: { type: Type.STRING, description: "包含談判策略與風險提示的 Markdown 格式文字" },
              estimatedPrice: { type: Type.NUMBER, description: "AI 估算出的合理市場單價" },
              breakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING, description: "分類 (例如：外購件費、加工費、管理費、運費等)" },
                    item: { type: Type.STRING, description: "成本分項名稱 (中文)" },
                    cost: { type: Type.NUMBER, description: "該分項的預估成本" },
                    basis: { type: Type.STRING, description: "計算基礎 (中文)" },
                    explanation: { type: Type.STRING, description: "計算說明：先寫出包含「實際數字」的數學公式（例如：1000 * 5 = 5000，不能只有文字），後面再摘要各個數字的簡要說明 (中文)" }
                  },
                  required: ["category", "item", "cost", "basis", "explanation"]
                }
              }
            },
            required: ["insights", "estimatedPrice", "breakdown"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      
      setAiInsights(data.insights || "無分析建議");
      setAiEstimatedPrice(data.estimatedPrice || stats.minPrice * 0.95); // 若沒產出，預設最低標打95折
      setCostBreakdown(data.breakdown || []);
      setPhase2(null);
      setPhase2Error(null);

      // Save to history
      const newEntry: CostHistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        totalPrice: data.estimatedPrice || stats.minPrice * 0.95,
        breakdown: data.breakdown || [],
        aiInsights: data.insights || "無分析建議"
      };
      
      setCostHistory(prev => {
        const newHistory = [newEntry, ...prev].slice(0, 5);
        
        // Save project with the new data
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
      let errorMessage = '分析過程中發生錯誤，請檢查網路連線或 API Key 設置。';
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API 請求次數已達上限 (Quota Exceeded)。請稍後再試，或檢查您的 API Key 額度。';
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
        text: `您好！我是您的採購 AI 助手。關於「${item.item}」的計算基礎（${item.basis}），您有任何疑問嗎？我可以為您詳細說明其市場行情、計算邏輯或潛在的議價空間。` 
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
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";

      const prompt = `
        你是一位資深的採購專家。目前正在重新評估購案「${confirmedItemDescription || itemName}」中的成本分項「${itemToUpdate.item}」。
        有效報價時間區間為：「${quoteTimeframe || '未指定'}」。
        原先的預估成本為 $${itemToUpdate.cost}，計算基礎為「${itemToUpdate.basis}」。
        現在使用者加入了新的修正條件與環境影響因素：「${itemToUpdate.customCondition}」。
        請根據這個新條件以及指定的報價時間區間的市場行情，重新估算該分項的成本，並更新計算基礎與說明。
        「說明」的格式必須是：先寫出包含「實際數字」的數學公式（例如：1000 * 5 = 5000，不能只有文字），後面再摘要各個數字的簡要說明。

        請以 JSON 格式回覆，格式如下：
        {
          "cost": number, // 新的預估成本
          "basis": string, // 新的計算基礎
          "explanation": string // 新的計算說明 (包含數學公式與數字說明)
        }
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cost: { type: Type.NUMBER },
              basis: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["cost", "basis", "explanation"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");

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
    setItemChatMessages([]);
    setProposedItemDescription('');
    setIsItemChatLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      const specsContext = consolidatedSpecs.map(s => `[${s.category}] ${s.content}`).join('\n');
      const prompt = `
        你是一位專業的採購助理。使用者想要採購的初步項目名稱為：「${itemName}」。
        目前已經確認的採購規格如下：
        ${specsContext || '無'}
        
        為了能夠進行精準的市場價格分析，你需要根據上述規格，進一步釐清這個品項的具體細節（例如：材質、尺寸、品牌、用途、特殊規格等）。
        請向使用者提出第一個問題來釐清這個品項。如果規格已經非常清楚，你可以直接總結。
        
        請以 JSON 格式回覆，格式如下：
        {
          "isComplete": false,
          "reply": "你的第一個問題"
        }
      `;
      
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isComplete: { type: Type.BOOLEAN },
              reply: { type: Type.STRING },
              itemDescription: { type: Type.STRING }
            },
            required: ["isComplete", "reply"]
          }
        }
      });
      
      if (response.text) {
        const result = JSON.parse(response.text);
        setItemChatMessages([{ role: 'ai', text: result.reply }]);
      }
    } catch (error) {
      console.error("Error starting item clarification:", error);
      setItemChatMessages([{ role: 'ai', text: "抱歉，系統發生錯誤，請稍後再試。" }]);
    } finally {
      setIsItemChatLoading(false);
    }
  };

  const handleSendItemChatMessage = async () => {
    if (!itemChatInput.trim()) return;
    
    const userMessage = itemChatInput.trim();
    setItemChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setItemChatInput('');
    setIsItemChatLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      const historyText = itemChatMessages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
      const specsContext = consolidatedSpecs.map(s => `[${s.category}] ${s.content}`).join('\n');
      
      const prompt = `
        你是一位專業的採購助理。使用者想要採購的初步項目名稱為：「${itemName}」。
        目前已經確認的採購規格如下：
        ${specsContext || '無'}
        
        你的目標是透過對話釐清這個品項的具體細節（例如：材質、尺寸、品牌、用途、特殊規格等），直到資訊足夠判斷是甚麼物品，並且足夠進行後續的 AI 價格分析。
        
        歷史對話：
        ${historyText}
        User: ${userMessage}
        
        請評估目前的資訊是否已經足夠。
        - 如果「不足夠」，請繼續提出下一個問題（isComplete: false）。
        - 如果「已經足夠」，請總結出一個完整的「品項類別與規格說明」，並詢問使用者是否確認（isComplete: true）。
        
        請以 JSON 格式回覆，格式如下：
        {
          "isComplete": boolean, // 資訊是否已足夠
          "reply": "給使用者的回覆（下一個問題，或是總結確認的文字）",
          "itemDescription": "如果 isComplete 為 true，請在這裡填寫完整的「品項類別與規格說明」；否則留空或不填。"
        }
      `;
      
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isComplete: { type: Type.BOOLEAN },
              reply: { type: Type.STRING },
              itemDescription: { type: Type.STRING }
            },
            required: ["isComplete", "reply"]
          }
        }
      });
      
      if (response.text) {
        const result = JSON.parse(response.text);
        setItemChatMessages(prev => [...prev, { role: 'ai', text: result.reply }]);
        if (result.isComplete && result.itemDescription) {
          setProposedItemDescription(result.itemDescription);
        }
      }
    } catch (error) {
      console.error("Error sending item chat message:", error);
      setItemChatMessages(prev => [...prev, { role: 'ai', text: "抱歉，系統發生錯誤，請稍後再試。" }]);
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
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const historyText = overallChatMessages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
      
      const prompt = `
        你是一位資深的整體採購專家。目前正在討論購案「${confirmedItemDescription || itemName}」的整體分析與價格。
        有效報價時間區間為：「${quoteTimeframe || '未指定'}」。
        目前確認的規格：
        ${consolidatedSpecs.map(s => `- [${s.category}] ${s.content}`).join('\n')}
        
        目前的 AI 成本估算總價：$${aiEstimatedPrice}
        目前的 AI 成本分項：
        ${costBreakdown.map(c => `- ${c.item}: $${c.cost} (${c.basis})`).join('\n')}
        
        目前的 AI 綜合建議：
        ${aiInsights}
        
        歷史對話：
        ${historyText}
        User: ${userMessage}
        
        請根據這些背景資訊，回答使用者的問題。請保持專業、客觀，並提供具體的市場洞察或談判建議。
        
        【重要指示】：
        1. 如果使用者在對話中提出了「新的規格定義」或「修改現有規格」（例如：改變材質、增加包裝要求、改變尺寸等），請將這些新規格整理成一段文字，並將 shouldUpdateSpecs 設為 true。
        2. 如果使用者確認了某些條件，並要求「重新估價」或「重新分析」，請將 shouldReestimate 設為 true。

        請以 JSON 格式回覆，格式如下：
        {
          "reply": "給使用者的文字回覆",
          "shouldUpdateSpecs": boolean,
          "newSpecs": "整理出的新規格描述 (若 shouldUpdateSpecs 為 true 則必填，否則留空)",
          "shouldReestimate": boolean
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              shouldUpdateSpecs: { type: Type.BOOLEAN },
              newSpecs: { type: Type.STRING },
              shouldReestimate: { type: Type.BOOLEAN }
            },
            required: ["reply", "shouldUpdateSpecs", "shouldReestimate"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      setOverallChatMessages(prev => [...prev, { role: 'model', text: data.reply || '抱歉，我現在無法回答這個問題。' }]);

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
      let errorMessage = '通訊發生錯誤，請稍後再試。';
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API 請求次數已達上限 (Quota Exceeded)。請稍後再試，或檢查您的 API Key 額度。';
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
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const historyText = chatMessages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
      
      const prompt = `
        你是一位資深的採購專家。目前正在討論購案「${confirmedItemDescription || itemName}」中的成本分項「${activeCostItem.item}」。
        有效報價時間區間為：「${quoteTimeframe || '未指定'}」。
        該項目的預估成本為 $${activeCostItem.cost}，計算基礎為「${activeCostItem.basis}」，計算說明為「${activeCostItem.explanation}」。
        
        歷史對話：
        ${historyText}
        User: ${userMessage}
        
        請根據這些背景資訊，回答使用者的問題。請保持專業、客觀，並提供具體的市場洞察或談判建議。
        如果使用者在對話中提出了新的條件（例如急件、特殊材質等），你可以詢問使用者是否要根據這些條件調整預估成本。
        如果使用者明確同意或要求調整預估成本，請在回覆中提供新的成本、計算基礎與計算說明。
        「計算說明」的格式必須是：先寫出包含「實際數字」的數學公式（例如：1000 * 5 = 5000，不能只有文字），後面再摘要各個數字的簡要說明。

        請以 JSON 格式回覆，格式如下：
        {
          "reply": "給使用者的文字回覆",
          "shouldUpdate": boolean, // 是否需要更新成本項目 (只有在使用者明確同意或要求調整時才為 true)
          "updatedCost": number, // 新的預估成本 (若 shouldUpdate 為 true 則必填)
          "updatedBasis": "新的計算基礎", // (若 shouldUpdate 為 true 則必填)
          "updatedExplanation": "新的計算說明" // (若 shouldUpdate 為 true 則必填)
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              shouldUpdate: { type: Type.BOOLEAN },
              updatedCost: { type: Type.NUMBER },
              updatedBasis: { type: Type.STRING },
              updatedExplanation: { type: Type.STRING }
            },
            required: ["reply", "shouldUpdate"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      setChatMessages(prev => [...prev, { role: 'model', text: data.reply || '抱歉，我現在無法回答這個問題。' }]);

      if (data.shouldUpdate && data.updatedCost !== undefined) {
        const index = costBreakdown.findIndex(item => item.item === activeCostItem.item);
        if (index !== -1) {
          setCostBreakdown(prev => {
            const newBreakdown = [...prev];
            newBreakdown[index] = {
              ...newBreakdown[index],
              cost: data.updatedCost,
              basis: data.updatedBasis || newBreakdown[index].basis,
              explanation: data.updatedExplanation || newBreakdown[index].explanation
            };
            
            const newTotal = newBreakdown.reduce((sum, item) => sum + item.cost, 0);
            setAiEstimatedPrice(newTotal);
            
            return newBreakdown;
          });
        }
      }
    } catch (error: unknown) {
      console.error('Chat Error:', error);
      let errorMessage = '通訊發生錯誤，請稍後再試。';
      const message = error instanceof Error ? error.message : '';
      if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'API 請求次數已達上限 (Quota Exceeded)。請稍後再試，或檢查您的 API Key 額度。';
      }
      setChatMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Initial setup visual delay if needed
  useEffect(() => {
    // Component mounted
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900" ref={appRef}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white shadow-sm rounded-2xl p-6 mb-8 border-l-8 border-red-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800">採購發包決策輔助系統</h1>
            <div className="mt-3">
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="輸入購案名稱"
                className="w-full md:w-[360px] p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={historyImportRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleImportHistoryFile}
            />
            <button
              onClick={exportHistoryAsExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-full font-bold transition-colors text-sm"
            >
              <Download size={16} />
              匯出 Excel
            </button>
            <button
              onClick={() => historyImportRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-full font-bold transition-colors text-sm"
            >
              <Upload size={16} />
              匯入 Excel
            </button>
            <button
              onClick={handleScreenshot}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full font-bold transition-colors text-sm"
            >
              <Camera size={16} />
              頁面截圖
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold transition-colors text-sm"
            >
              <RefreshCw size={14} /> 清除所有內容
            </button>
            <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full border border-red-100">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-red-700">AI 實時分析模式</span>
            </div>
          </div>
        </header>
        {historyFeedback && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 text-sm font-bold text-blue-700">
            {historyFeedback}
          </div>
        )}

        {/* 頁籤導覽列 */}
        <div className="mb-6 flex items-center gap-0 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          <button
            onClick={() => setActiveTab('phase1')}
            className={cn(
              'flex-1 px-6 py-4 font-bold text-sm uppercase tracking-wider transition-all relative flex items-center justify-center gap-2',
              activeTab === 'phase1'
                ? 'text-blue-700 bg-gradient-to-b from-blue-50 to-blue-50 border-b-4 border-blue-600'
                : 'text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50'
            )}
          >
            <BrainCircuit size={18} />
            第一階段：AI 成本模擬
          </button>
          <div className="w-px h-8 bg-slate-200" />
          <button
            onClick={() => setActiveTab('phase2')}
            className={cn(
              'flex-1 px-6 py-4 font-bold text-sm uppercase tracking-wider transition-all relative flex items-center justify-center gap-2',
              activeTab === 'phase2'
                ? 'text-violet-700 bg-gradient-to-b from-violet-50 to-violet-50 border-b-4 border-violet-600'
                : 'text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50'
            )}
          >
            <Scale size={18} />
            第二階段：廠商報價比對
          </button>
          <div className="w-px h-8 bg-slate-200" />
          <button
            onClick={() => setActiveTab('phase3')}
            className={cn(
              'flex-1 px-6 py-4 font-bold text-sm uppercase tracking-wider transition-all relative flex items-center justify-center gap-2',
              activeTab === 'phase3'
                ? 'text-emerald-700 bg-gradient-to-b from-emerald-50 to-emerald-50 border-b-4 border-emerald-600'
                : 'text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50'
            )}
          >
            <TrendingDown size={18} />
            第三階段：主管決策報表
          </button>
        </div>

        {/* 主要內容區塊 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左欄：第一階段 - 輸入採購專案條件 */}
          {activeTab === 'phase1' && (
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Plus className="text-red-600" /> 購案資訊輸入
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
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowProjectDetails(!showProjectDetails)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
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
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">簽呈單文件編號</label>
                            <input type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">隸屬部門</label>
                              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">隸屬科別</label>
                              <input type="text" value={section} onChange={(e) => setSection(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">申請人</label>
                              <input type="text" value={applicant} onChange={(e) => setApplicant(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">預算金額</label>
                              <input type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(Number(e.target.value) || '')} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">承辦科</label>
                              <input type="text" value={handlingSection} onChange={(e) => setHandlingSection(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">承辦人</label>
                              <input type="text" value={handler} onChange={(e) => setHandler(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
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

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">廠商報價對比</h3>
                    <div className="flex items-center gap-2">
                      {confirmedItemDescription && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={fetchRecommendedVendors}
                            disabled={isFetchingRecommendedVendors}
                            className="px-2 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-xs font-bold transition-colors"
                            title="重新搜尋廠商"
                          >
                            <RefreshCw size={14} className={isFetchingRecommendedVendors ? "animate-spin" : ""} />
                          </button>
                          <button
                            onClick={recommendedVendors.length > 0 ? () => setShowRecommendedVendorsModal(true) : fetchRecommendedVendors}
                            className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
                          >
                            <Building2 size={14} /> 推薦廠商
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={handleAddVendor}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                      <button 
                        onClick={() => setShowVendorSection(!showVendorSection)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                      >
                        {showVendorSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {showVendorSection && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          <AnimatePresence initial={false}>
                            {vendors.map((vendor) => (
                              <motion.div 
                                key={vendor.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex gap-2 items-center group"
                              >
                                <input 
                                  type="text" 
                                  placeholder="廠商名稱" 
                                  value={vendor.name}
                                  onChange={(e) => handleVendorChange(vendor.id, 'name', e.target.value)}
                                  className="w-1/2 p-2.5 border border-slate-200 rounded-lg text-sm focus:border-red-500 outline-none"
                                />
                                <div className="relative w-1/2">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                  <input 
                                    type="number" 
                                    placeholder="單價" 
                                    value={vendor.price || ''}
                                    onChange={(e) => handleVendorChange(vendor.id, 'price', Number(e.target.value))}
                                    className="w-full p-2.5 pl-6 border rounded-lg text-sm focus:border-red-500 outline-none font-medium bg-white border-slate-200"
                                  />
                                </div>
                                <button 
                                  onClick={() => handleRemoveVendor(vendor.id)}
                                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                        
                        {/* Chart Section */}
                        <div className="pt-4 mt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">廠商單價對比圖</h3>
                          </div>

                          <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                layout="vertical"
                                data={chartData}
                                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  axisLine={false} 
                                  tickLine={false}
                                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                  width={60}
                                />
                                <Tooltip 
                                  cursor={{ fill: '#f8fafc' }}
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                  formatter={(value: number) => [`$${value.toLocaleString()}`, '單價']}
                                />
                                <Bar dataKey="price" radius={[0, 8, 8, 0]} barSize={24}>
                                  {chartData.map((entry, index) => {
                                    let fill = '#3b82f6'; // Blue for vendors
                                    if (entry.type === 'ai') fill = '#f59e0b'; // Amber for AI
                                    return <Cell key={`cell-${index}`} fill={fill} />;
                                  })}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </div>
          )}

          {/* 右欄：第一階段 - AI 初步成本分析結果 & 第二階段 - 廠商報價比對 */}
          <div className={cn('space-y-8', activeTab === 'phase1' ? 'lg:col-span-8' : 'lg:col-span-9')}>
            {/* Stats Grid - 只在第一階段顯示 */}
            {activeTab === 'phase1' && (
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
                <p className="text-3xl font-black text-green-600">${aiEstimatedPrice !== null ? aiEstimatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
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
                <p className="text-3xl font-black text-blue-600">${aiEstimatedPrice !== null ? (aiEstimatedPrice * (Number(totalQty) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
              </motion.div>
            </div>
            )}

            {/* AI Cost Breakdown Section - 只在第一階段顯示 */}
            {activeTab === 'phase1' && aiEstimatedPrice !== null && (
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
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold">
                              <th className="p-4">分類</th>
                              <th className="p-4">項目</th>
                              <th className="p-4">預估成本</th>
                              <th className="p-4">計算基礎</th>
                              <th className="p-4">計算說明</th>
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
            )}

            {/* Phase 2: 廠商 PDF 報價單解析與比對談判引擎 - 只在第二階段顯示 */}
            {activeTab === 'phase2' && (
              <>
                {/* 第一階段 AI 分析結果參考 - 在第二階段頂部顯示 */}
                {aiEstimatedPrice !== null && costBreakdown.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-blue-50/80 rounded-2xl border border-blue-200/60">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <TrendingDown className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">AI 估算單價參考</p>
                        <p className="text-xl font-black text-blue-900">${aiEstimatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-green-600 font-bold uppercase tracking-wider">AI 估算總價參考</p>
                        <p className="text-xl font-black text-green-900">${(aiEstimatedPrice * (Number(totalQty) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Phase 2: 廠商 PDF 報價單解析與比對談判引擎 - 只在第二階段顯示 */}
            {activeTab === 'phase2' && aiEstimatedPrice !== null && costBreakdown.length > 0 && (
              <section className="bg-gradient-to-br from-slate-50 to-violet-50/80 p-8 rounded-3xl shadow-xl border border-violet-200/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3 text-violet-800">
                    <div className="p-2.5 bg-violet-100 rounded-xl border border-violet-200">
                      <Scale className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">
                        第二階段：廠商 PDF 報價單解析與比對談判
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        上傳廠商報價 PDF → Gemini 視覺萃取 → 結構對齊 → 差異表與談判策略
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={vendorPdfInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleVendorQuotePdfSelected}
                    />
                    <button
                      type="button"
                      onClick={() => vendorPdfInputRef.current?.click()}
                      disabled={
                        isPhase2Parsing || isPhase2Aligning || isPhase2Negotiating
                      }
                      className={cn(
                        'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all',
                        isPhase2Parsing || isPhase2Aligning || isPhase2Negotiating
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-lg'
                      )}
                    >
                      {(isPhase2Parsing || isPhase2Aligning || isPhase2Negotiating) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      上傳廠商報價單（PDF）
                    </button>
                  </div>
                </div>

                {(isPhase2Parsing || isPhase2Aligning || isPhase2Negotiating) && (
                  <div className="mb-4 flex flex-wrap gap-3 text-xs font-semibold text-violet-900">
                    {isPhase2Parsing && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-violet-200 shadow-sm">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        解析 PDF（Gemini 視覺萃取）…
                      </span>
                    )}
                    {isPhase2Aligning && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-violet-200 shadow-sm">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        AI 結構對齊（Apples-to-Apples）…
                      </span>
                    )}
                    {isPhase2Negotiating && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-violet-200 shadow-sm">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        生成談判策略…
                      </span>
                    )}
                  </div>
                )}

                {phase2Error && (
                  <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex gap-2 items-start">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{phase2Error}</span>
                  </div>
                )}

                {phase2?.vendorPdfFileName && (
                  <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <FileSearch className="w-4 h-4 text-violet-600" />
                    <span className="font-bold text-slate-700">已解析檔案：</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {phase2.vendorPdfFileName}
                    </span>
                    {phase2.vendorPdfParsedLines.length > 0 && (
                      <span className="text-xs text-slate-500">
                        （萃取 {phase2.vendorPdfParsedLines.length} 筆細項）
                      </span>
                    )}
                  </div>
                )}

                {phase2 && phase2.alignedRows.length > 0 && (
                  <>
                    <div className="mb-2 flex items-center gap-2 text-slate-800">
                      <FileText className="w-5 h-5 text-violet-600" />
                      <h4 className="text-lg font-black">差異分析比較表</h4>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-violet-100 bg-white shadow-inner mb-8">
                      <table className="w-full text-left text-sm min-w-[900px]">
                        <thead>
                          <tr className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                            <th className="p-4 font-bold rounded-tl-2xl">成本細項</th>
                            <th className="p-4 font-bold">廠商報價</th>
                            <th className="p-4 font-bold">AI 合理預估</th>
                            <th className="p-4 font-bold">差異金額</th>
                            <th className="p-4 font-bold">差異百分比</th>
                            <th className="p-4 font-bold rounded-tr-2xl">議價操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {phase2.alignedRows.map((row, idx) => {
                            const vendorHighVersusAi =
                              row.aiEstimate > 0
                                ? row.vendorQuote > row.aiEstimate * 1.1
                                : row.vendorQuote > 0;
                            const negotiationRecord = phase2.negotiationRecords?.find(r => r.item === row.item);
                            const isExpanded = expandedNegotiationItems?.includes(row.item);

                            return (
                              <React.Fragment key={`${row.item}-${idx}`}>
                                <tr
                                  className={cn(
                                    'transition-colors',
                                    vendorHighVersusAi
                                      ? 'bg-red-50/90 hover:bg-red-50'
                                      : 'hover:bg-slate-50/80'
                                  )}
                                >
                                  <td
                                    className={cn(
                                      'p-4 font-bold',
                                      vendorHighVersusAi ? 'text-red-900' : 'text-slate-800'
                                    )}
                                  >
                                    {row.item}
                                  </td>
                                  <td
                                    className={cn(
                                      'p-4 font-mono font-semibold',
                                      vendorHighVersusAi ? 'text-red-700' : 'text-slate-700'
                                    )}
                                  >
                                    $
                                    {row.vendorQuote.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="p-4">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectPhase2AnalysisItem(row)}
                                      disabled={isPhase2AnalysisLoading}
                                      className={cn(
                                        'text-left rounded-lg transition-colors cursor-pointer',
                                        selectedAnalysisItem?.item === row.item
                                          ? 'bg-emerald-50/80'
                                          : 'hover:bg-slate-50'
                                      )}
                                      title="點擊查看分析"
                                    >
                                      <div className="font-mono text-emerald-700 font-semibold underline underline-offset-4 decoration-emerald-300 hover:text-emerald-800">
                                        $
                                        {row.aiEstimate.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-1 italic">
                                        點擊查看分析
                                      </div>
                                    </button>
                                  </td>
                                  <td
                                    className={cn(
                                      'p-4 font-mono font-bold',
                                      row.varianceAmount > 0
                                        ? 'text-red-600'
                                        : row.varianceAmount < 0
                                          ? 'text-emerald-600'
                                          : 'text-slate-600'
                                    )}
                                  >
                                    {row.varianceAmount > 0 ? '+' : ''}
                                    $
                                    {row.varianceAmount.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="p-4 font-mono text-slate-700">
                                    {row.variancePercent !== null
                                      ? `${row.variancePercent > 0 ? '+' : ''}${row.variancePercent.toFixed(1)}%`
                                      : '—'}
                                  </td>
                                  <td className="p-4">
                                    <button
                                      onClick={() => toggleNegotiationForm(row.item)}
                                      className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1',
                                        isExpanded
                                          ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      )}
                                    >
                                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                      {negotiationRecord ? '編輯議價' : '開始議價'}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-violet-50/30">
                                    <td colSpan={6} className="p-4">
                                      <NegotiationForm
                                        item={row.item}
                                        currentRecord={negotiationRecord}
                                        onSave={(record) => saveNegotiationRecord(record)}
                                        onCancel={() => toggleNegotiationForm(row.item)}
                                      />
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                          {/* 總計列 */}
                          <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white font-black text-base border-t-2 border-slate-600">
                            <td className="p-4 rounded-bl-2xl">總計</td>
                            <td className="p-4 font-mono">
                              $
                              {phase2.alignedRows.reduce((sum, row) => sum + row.vendorQuote, 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-4 font-mono">
                              $
                              {phase2.alignedRows.reduce((sum, row) => sum + row.aiEstimate, 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className={cn(
                              'p-4 font-mono',
                              phase2.alignedRows.reduce((sum, row) => sum + row.varianceAmount, 0) > 0
                                ? 'text-red-300'
                                : phase2.alignedRows.reduce((sum, row) => sum + row.varianceAmount, 0) < 0
                                  ? 'text-emerald-300'
                                  : 'text-slate-300'
                            )}>
                              {phase2.alignedRows.reduce((sum, row) => sum + row.varianceAmount, 0) > 0 ? '+' : ''}
                              $
                              {phase2.alignedRows.reduce((sum, row) => sum + row.varianceAmount, 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td colSpan={2} className="p-4 rounded-br-2xl text-slate-300">
                              廠商 vs AI 總差異
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-8 -mt-4 px-1">
                      * 當「廠商報價」高於「AI 合理預估」超過 10% 時，該列以紅底標示以利議價聚焦。
                    </p>
                  </>
                )}

                {/* 專屬 AI 助理對話框 */}
                {phase2 && (
                  <div className="mb-8 bg-white border border-violet-200 rounded-2xl p-6 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-black text-violet-900 flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        議價專屬 AI 助理
                      </h4>
                      <button
                        onClick={regenerateNegotiationStrategy}
                        disabled={isPhase2Negotiating}
                        className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isPhase2Negotiating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        產生/更新進階談判策略
                      </button>
                    </div>

                    {/* 對話區域 */}
                    <div className="mb-4 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-4 bg-slate-50">
                      {phase2.phase2ChatMessages && phase2.phase2ChatMessages.length > 0 ? (
                        <div className="space-y-4">
                          {phase2.phase2ChatMessages.map((msg, idx) => (
                            <div key={idx} className={cn(
                              'flex gap-3',
                              msg.role === 'user' ? 'justify-end' : 'justify-start'
                            )}>
                              {msg.role === 'assistant' && (
                                <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Bot size={16} className="text-violet-600" />
                                </div>
                              )}
                              <div className={cn(
                                'max-w-[80%] p-3 rounded-2xl text-sm',
                                msg.role === 'user'
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-800'
                              )}>
                                <Markdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                                  {msg.text}
                                </Markdown>
                              </div>
                              {msg.role === 'user' && (
                                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User size={16} className="text-slate-600" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-slate-500 py-8">
                          <Bot size={48} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">還沒有對話記錄。輸入問題開始與 AI 助理討論議價策略！</p>
                        </div>
                      )}
                    </div>

                    {/* 輸入區域 */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={phase2ChatInput}
                        onChange={(e) => setPhase2ChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handlePhase2ChatMessage()}
                        placeholder="詢問議價相關問題，例如：「加工費的耗損率通常抓多少才合理？」"
                        className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                        disabled={isPhase2ChatLoading}
                      />
                      <button
                        onClick={handlePhase2ChatMessage}
                        disabled={!phase2ChatInput.trim() || isPhase2ChatLoading}
                        className="px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center gap-2 font-medium"
                      >
                        {isPhase2ChatLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                        發送
                      </button>
                    </div>
                  </div>
                )}

                {phase2?.negotiationStrategy && (
                  <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 shadow-md">
                    <h4 className="text-lg font-black text-amber-900 mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      {phase2.negotiationRecords && phase2.negotiationRecords.length > 0
                        ? '進階談判策略 (已納入議價回饋)'
                        : '智能談判策略'
                      }
                    </h4>
                    <div className="prose prose-sm max-w-none prose-headings:text-amber-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-amber-950">
                      <Markdown remarkPlugins={[remarkGfm]}>{phase2.negotiationStrategy}</Markdown>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Phase 3: 主管決策報表 */}
            {activeTab === 'phase3' && (
              <section className="space-y-8">
                {/* 頂部圖表區 */}
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-100 rounded-xl border border-emerald-200">
                        <BarChart size={24} className="text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">
                          價格組成與議價成果堆疊圖
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          展示從最初預算、各項成本堆疊，到最終議價後總額 (Commit)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={phase3.isMerged}
                            onChange={(e) => handleTogglePhase3Merge(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </div>
                        <span className="text-sm font-bold text-slate-600 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                          <Plus className={cn("w-4 h-4 transition-transform", phase3.isMerged ? "rotate-45" : "rotate-0")} />
                          分類合併模式
                        </span>
                      </label>
                      <div className="w-px h-6 bg-slate-300 mx-2" />
                      <button
                        onClick={regenerateAllPhase3Justifications}
                        disabled={phase3.isGeneratingJustification || !phase2}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={phase3.isGeneratingJustification ? "animate-spin" : ""} />
                        更新 AI 辯護
                      </button>
                    </div>
                  </div>

                  {phase2 ? (
                    <div className="h-[450px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: '原始預算', price: Number(budgetAmount) || 0, type: 'budget' },
                            ...aggregatePhase3Data(phase2, phase3.isMerged).map(d => ({
                              name: d.name,
                              price: d.finalPrice,
                              vendorQuote: d.vendorQuote,
                              type: 'item'
                            })),
                            {
                              name: '最終成交價',
                              price: aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.finalPrice, 0),
                              type: 'commit'
                            }
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                            tickFormatter={(val) => `$${val.toLocaleString()}`}
                          />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, '金額']}
                          />
                          <Bar dataKey="price" radius={[8, 8, 0, 0]} barSize={40}>
                            {[
                              { name: '原始預算', type: 'budget' },
                              ...aggregatePhase3Data(phase2, phase3.isMerged),
                              { name: '最終成交價', type: 'commit' }
                            ].map((entry, index) => {
                              const itemType = (entry as { type?: string }).type;
                              let fill = '#10b981'; // emerald-500
                              if (itemType === 'budget') fill = '#3b82f6'; // blue-500
                              if (itemType === 'commit') fill = '#059669'; // emerald-600
                              if (itemType === 'item') fill = '#6366f1'; // indigo-500
                              return <Cell key={`cell-${index}`} fill={fill} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[450px] flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <TrendingDown size={48} className="text-slate-300 mb-4" />
                      <p className="text-slate-500 font-bold">請先完成第二階段「廠商報價比對」以產生報表</p>
                    </div>
                  )}
                </div>

                {/* 價格組成表 */}
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <LayoutList size={20} className="text-emerald-600" />
                      價格組成與合理性說明表
                    </h4>
                    {phase3.isGeneratingJustification && (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 animate-pulse">
                        <Loader2 size={14} className="animate-spin" />
                        AI 辯護律師撰寫中...
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                          <th className="p-5">分類</th>
                          {!phase3.isMerged && <th className="p-5">費用項目</th>}
                          <th className="p-5 text-right">廠商報價</th>
                          <th className="p-5 text-right">議價後金額</th>
                          <th className="p-5">AI 採購辯護律師：合理性說明</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {phase2 ? aggregatePhase3Data(phase2, phase3.isMerged).map((row, idx) => (
                          <tr key={`${row.name}-${idx}`} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="p-5">
                              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200">
                                {row.category}
                              </span>
                            </td>
                            {!phase3.isMerged && (
                              <td className="p-5 font-bold text-slate-800">
                                {row.name}
                              </td>
                            )}
                            <td className="p-5 text-right font-mono text-slate-400 group-hover:text-slate-600">
                              ${row.vendorQuote.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-5 text-right font-mono font-black text-emerald-700 text-base">
                              ${row.finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-5 min-w-[300px]">
                              {phase3.justifications[row.name] ? (
                                <div className="flex items-start gap-3">
                                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                  <p className="text-slate-600 leading-relaxed italic">
                                    「{phase3.justifications[row.name]}」
                                  </p>
                                </div>
                              ) : (
                                <div className="text-slate-300 italic flex items-center gap-2">
                                  {phase3.isGeneratingJustification ? (
                                    <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> 正在生成合理性說明...</span>
                                  ) : (
                                    <span>尚未產生說明</span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={phase3.isMerged ? 4 : 5} className="p-12 text-center text-slate-400 italic">
                              暫無報表數據，請先完成議價。
                            </td>
                          </tr>
                        )}
                        {phase2 && (
                          <tr className="bg-emerald-50/50 font-black text-emerald-900 border-t-2 border-emerald-100">
                            <td className="p-5" colSpan={phase3.isMerged ? 1 : 2}>總計成交額 (Commit)</td>
                            <td className="p-5 text-right font-mono">
                              ${aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.vendorQuote, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-5 text-right font-mono text-xl">
                              ${aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.finalPrice, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-5 text-emerald-600 text-xs italic">
                              相較廠商初始總報價已爭取到約 {(((aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.vendorQuote, 0) - aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.finalPrice, 0)) / aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.vendorQuote, 1)) * 100).toFixed(1)}% 的降幅空間
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* AI Insights Section */}
            <section className="bg-slate-900 text-slate-100 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl -mr-32 -mt-32 rounded-full" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 blur-3xl -ml-32 -mb-32 rounded-full" />
              
              <button 
                onClick={() => setShowAiInsights(!showAiInsights)}
                className="w-full text-left flex items-center justify-between relative z-10 group"
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
                      onClick={() => handleSectionScreenshot(aiInsightsRef.current, 'ai-insights')}
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
              </button>

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

            {/* Overall AI Chat Section - 只在第一階段顯示 */}
            {activeTab === 'phase1' && aiInsights && (
              <section className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 mt-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3 text-blue-600">
                    <BrainCircuit size={24} />
                    <h3 className="text-xl font-black text-slate-800">整體採購專家 AI 對話</h3>
                  </div>
                  <button 
                    onClick={() => setShowOverallChat(!showOverallChat)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all"
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
            )}
          </div>

          {/* Right Column: History Panel */}
          <div className="lg:col-span-3">
            <section className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200 sticky top-6 max-h-[calc(100vh-48px)] flex flex-col overflow-hidden min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <FolderOpen size={16} className="text-blue-600" />
                  歷史紀錄清單
                </h3>
                <span className="text-xs font-bold text-slate-400">{savedProjects.length} 筆</span>
              </div>
              <div className="space-y-3 max-h-[38vh] overflow-y-auto custom-scrollbar pr-1">
                {savedProjects.length === 0 ? (
                  <div className="text-sm text-slate-400 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    尚無歷史紀錄，可先執行分析後儲存，或直接匯入 Excel。
                  </div>
                ) : (
                  savedProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => loadProject(project)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all",
                        currentProjectId === project.id
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                      )}
                    >
                      <p className="text-sm font-black text-slate-800 truncate">{project.projectName}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">品項：{project.itemName || '未填寫'}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(project.timestamp).toLocaleString()}</p>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col min-h-0 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <BrainCircuit size={16} className="text-violet-600" />
                    AI 估算邏輯與成本拆解分析
                  </h3>
                  {selectedAnalysisItem && (
                    <button
                      type="button"
                      onClick={() => setSelectedAnalysisItem(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      清除
                    </button>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-4 custom-scrollbar">
                  {!selectedAnalysisItem ? (
                    <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-slate-700 text-sm font-medium flex gap-2 items-start">
                      <Lightbulb className="w-5 h-5 shrink-0 text-violet-700 mt-0.5" />
                      <span>請點擊左側表格的「AI 合理預估」金額，查看詳細成本分析。</span>
                    </div>
                  ) : isPhase2AnalysisLoading ? (
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-medium flex gap-2 items-center">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                      <span>議價專屬 AI 助理正在產生分析…</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {phase2AnalysisError && (
                        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex gap-2 items-start">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <span>{phase2AnalysisError}</span>
                        </div>
                      )}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">項目名稱與金額</p>
                        <p className="mt-2 text-base font-black text-slate-900">【{selectedAnalysisItem.item}】 AI 基準價：<span className="font-mono text-emerald-700">${selectedAnalysisItem.aiEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                        <p className="mt-2 text-sm text-slate-600">廠商報價：<span className="font-mono text-slate-800">${selectedAnalysisItem.vendorQuote.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                        <p className="mt-1 text-sm text-slate-600">差異金額：<span className="font-mono text-slate-800">{selectedAnalysisItem.varianceAmount > 0 ? '+' : ''}${selectedAnalysisItem.varianceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider">
                          <FileText size={14} className="text-slate-500" />
                          估算邏輯
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">{selectedAnalysisItem.calculationLogic}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider">
                          <Lightbulb size={14} className="text-amber-500" />
                          市場洞察與顧問建議
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                          {selectedAnalysisItem.consultantAnalysis || '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Chat Overlay / "New Tab" View */}
      <AnimatePresence>
        {activeChatId && activeCostItem && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white flex flex-col md:flex-row"
          >
            {/* Sidebar / Info Panel */}
            <div className="w-full md:w-1/3 bg-slate-900 text-white p-8 overflow-y-auto">
              <button 
                onClick={() => setActiveChatId(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>返回決策系統</span>
              </button>

              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-black mb-2 text-yellow-400">{activeCostItem.item}</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">詳細成本分析</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <p className="text-xs font-black text-slate-500 uppercase mb-2">預估單價成本</p>
                    <p className="text-4xl font-black text-white">${activeCostItem.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-500 uppercase mb-3">計算基礎</h4>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                      <p className="text-slate-200 leading-relaxed">{activeCostItem.basis}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-500 uppercase mb-3">AI 計算說明</h4>
                    <p className="text-slate-400 text-sm leading-relaxed italic">
                      「{activeCostItem.explanation}」
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-500 uppercase mb-3">修正條件與環境影響</h4>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-3">
                      <input
                        type="text"
                        value={activeCostItem.customCondition || ''}
                        onChange={(e) => {
                          const index = costBreakdown.findIndex(item => item.item === activeCostItem.item);
                          if (index !== -1) handleConditionChange(index, e.target.value);
                        }}
                        placeholder="例如：急件、偏遠地區..."
                        className="w-full text-sm p-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white placeholder:text-slate-600"
                        disabled={activeCostItem.isUpdating}
                      />
                      <button
                        onClick={() => {
                          const index = costBreakdown.findIndex(item => item.item === activeCostItem.item);
                          if (index !== -1) handleUpdateCostItem(index);
                        }}
                        disabled={!activeCostItem.customCondition || activeCostItem.isUpdating}
                        className={cn(
                          "w-full py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-bold",
                          !activeCostItem.customCondition || activeCostItem.isUpdating 
                            ? "bg-slate-700 text-slate-500 cursor-not-allowed" 
                            : "bg-yellow-500 text-slate-900 hover:bg-yellow-400"
                        )}
                      >
                        {activeCostItem.isUpdating ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            更新中...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} />
                            更新預估成本
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-800">
                  <div className="flex items-center gap-3 text-yellow-400/50 text-xs">
                    <Sparkles size={14} />
                    <span>由 Gemini 3.1 Pro 提供技術支持</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 flex flex-col bg-slate-50 relative">
              <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white">
                    <BrainCircuit size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">採購專家 AI 對話</h3>
                    <p className="text-xs text-slate-400">正在討論：{activeCostItem.item}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveChatId(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {chatMessages.map((msg, i) => (
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
                        ? "bg-red-600 text-white rounded-tr-none" 
                        : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                      {msg.role === 'user' ? '您' : 'AI 顧問'}
                    </span>
                  </motion.div>
                ))}
                {isChatLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                    <Loader2 size={14} className="animate-spin" />
                    AI 正在思考中...
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-slate-200">
                <div className="max-w-4xl mx-auto relative">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="請輸入您的問題，例如：『這個成本是否包含運費？』"
                    className="w-full p-4 pr-16 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all",
                      chatInput.trim() && !isChatLoading ? "bg-red-600 text-white shadow-lg shadow-red-200" : "bg-slate-200 text-slate-400"
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

      {/* Specification Summary Modal */}
      <AnimatePresence>
        {showSpecSummary && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSpecSummary(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                    <LayoutList size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800">規格彙總報告</h3>
                    <p className="text-xs text-slate-400">{itemName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSpecSummary(false)}
                  className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-8">
                  <section>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">基礎資訊</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">採購總量</p>
                        <p className="text-xl font-black text-slate-800">{totalQty.toLocaleString()} 單位</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">AI 規格條件彙總與矛盾檢測</h4>
                    
                    {isConsolidating ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
                        <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-600 font-bold">正在由 AI 讀取文件並交叉比對規格...</p>
                        <p className="text-slate-400 text-sm mt-2">這可能需要幾秒鐘的時間</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-slate-100">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold">
                              <th className="p-4 w-16">編號</th>
                              <th className="p-4 w-32">規格類別</th>
                              <th className="p-4">採用規格內容</th>
                              <th className="p-4 w-64">矛盾檢測與備註</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {consolidationError ? (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-red-500 font-bold">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <AlertTriangle size={24} />
                                    <span>{consolidationError}</span>
                                  </div>
                                </td>
                              </tr>
                            ) : consolidatedSpecs.length > 0 ? (
                              consolidatedSpecs.map((spec, i) => (
                                <tr key={i} className={cn(
                                  "transition-colors",
                                  spec.hasContradiction ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-slate-50/50"
                                )}>
                                  <td className="p-4 font-black text-slate-300">{(i + 1).toString().padStart(2, '0')}</td>
                                  <td className="p-4">
                                    <div className="font-bold text-slate-700 mb-1">{spec.category}</div>
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                      spec.source.includes('文件') ? "bg-blue-100 text-blue-700" : 
                                      spec.source.includes('補充') ? "bg-purple-100 text-purple-700" : 
                                      "bg-slate-200 text-slate-600"
                                    )}>
                                      {spec.source}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    {editingSpecIndex === i ? (
                                      <div className="flex flex-col gap-2">
                                        <textarea
                                          value={editingContent}
                                          onChange={(e) => setEditingContent(e.target.value)}
                                          className="w-full p-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y min-h-[80px]"
                                        />
                                        <div className="flex justify-end gap-2">
                                          <button onClick={cancelEditing} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-md">取消</button>
                                          <button onClick={() => saveEditing(i)} className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1"><Save size={12}/> 儲存</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="group relative pr-8">
                                        <div className="flex items-start gap-2">
                                          {spec.hasContradiction && <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />}
                                          <span className={cn(
                                            "leading-relaxed",
                                            spec.hasContradiction ? "text-green-700 font-bold" : "text-slate-600"
                                          )}>
                                            {spec.content}
                                          </span>
                                        </div>
                                        {spec.hasContradiction && (
                                          <div className="mt-2 text-xs text-green-600/80 font-bold flex items-center gap-1">
                                            <Sparkles size={12} />
                                            已自動採用較嚴苛條件
                                          </div>
                                        )}
                                        <button 
                                          onClick={() => startEditing(i, spec.content)}
                                          className="absolute right-0 top-0 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                          title="手動修改規格"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    {spec.hasContradiction ? (
                                      <div className="space-y-2">
                                        <div className="flex items-start gap-1.5 text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                                          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                          <span className="text-xs font-bold leading-tight">{spec.warningMessage}</span>
                                        </div>
                                        {spec.rejectedContent && (
                                          <div className="flex items-start gap-1.5 text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                                            <div className="text-xs">
                                              <span className="font-bold block mb-0.5">未採納規格：</span>
                                              <span className="line-through">{spec.rejectedContent}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 text-xs italic">無衝突</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                                  尚無任何規格條件紀錄或分析失敗
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setShowSpecSummary(false)}
                  className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  稍後再說
                </button>
                <button 
                  onClick={() => {
                    setIsSpecsConfirmed(true);
                    setShowSpecSummary(false);
                  }}
                  disabled={consolidatedSpecs.length === 0}
                  className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  確認全數規格並套用
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Clarification Modal */}
      <AnimatePresence>
        {isItemModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsItemModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">AI 品項釐清與確認</h2>
                    <p className="text-xs text-slate-500 font-medium">請回答 AI 的問題，以便精準判斷採購品項</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsItemModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                {itemChatMessages.map((msg, idx) => (
                  <div key={idx} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      msg.role === 'user' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {isItemChatLoading && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <Bot size={16} />
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-amber-500" />
                      <span className="text-sm text-slate-500">AI 思考中...</span>
                    </div>
                  </div>
                )}

                {proposedItemDescription && !isItemChatLoading && (
                  <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-2xl">
                    <h4 className="text-sm font-black text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle2 size={16} /> AI 總結品項類別與規格
                    </h4>
                    <p className="text-sm text-green-700 mb-4">{proposedItemDescription}</p>
                    <button
                      onClick={() => {
                        setConfirmedItemDescription(proposedItemDescription);
                        setIsItemModalOpen(false);
                        saveCurrentProject(proposedItemDescription);
                      }}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-black text-sm hover:bg-green-700 transition-all shadow-md shadow-green-200"
                    >
                      確認此品項類別
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={itemChatInput}
                    onChange={(e) => setItemChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendItemChatMessage()}
                    placeholder={proposedItemDescription ? "若需修改，請繼續輸入..." : "輸入您的回答..."}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={isItemChatLoading}
                  />
                  <button
                    onClick={handleSendItemChatMessage}
                    disabled={!itemChatInput.trim() || isItemChatLoading}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
      {/* Diff Modal */}
      <AnimatePresence>
        {showDiffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3 text-slate-800">
                  <GitCompare size={24} className="text-blue-600" />
                  <h2 className="text-xl font-black">AI 成本估算歷史與差異分析</h2>
                </div>
                <button 
                  onClick={() => setShowDiffModal(false)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                <div className="space-y-4">
                  {costHistory.map((entry, index) => {
                    const isNewest = index === 0;
                    const isExpanded = expandedDiffId === entry.id;
                    const diffData = diffExplanations[entry.id];

                    return (
                      <div key={entry.id} className={cn(
                        "bg-white border rounded-2xl overflow-hidden transition-all shadow-sm diff-report-container",
                        isNewest ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200"
                      )}>
                        <div className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm",
                              isNewest ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                            )}>
                              {isNewest ? '採用' : `#${costHistory.length - index}`}
                            </div>
                            <div>
                              <div className="text-sm text-slate-500 mb-1">
                                {new Date(entry.timestamp).toLocaleString()}
                              </div>
                              <div className="text-2xl font-black text-slate-800">
                                ${entry.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!isNewest && (
                              <>
                                <button
                                  onClick={() => handleSetAdopted(entry)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all bg-green-50 text-green-600 hover:bg-green-100"
                                >
                                  <Save size={16} />
                                  設為採用
                                </button>
                                <button
                                  onClick={() => handleCompareDiff(entry)}
                                  className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                    isExpanded 
                                      ? "bg-slate-100 text-slate-600" 
                                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  )}
                                >
                                  <GitCompare size={16} />
                                  {isExpanded ? '收合分析' : '與採用版本比較'}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteHistoryEntry(entry.id)}
                              className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
                              title="刪除此版本"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && !isNewest && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-slate-100 bg-slate-50/50"
                            >
                              <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
                                    <Sparkles size={16} className="text-amber-500" />
                                    AI 差異分析報告
                                  </h4>
                                  <button 
                                    onClick={(e) => {
                                      const target = e.currentTarget.closest('.diff-report-container') as HTMLElement;
                                      handleSectionScreenshot(target, 'diff-report');
                                    }}
                                    className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="截圖此分析"
                                  >
                                    <Camera size={14} />
                                  </button>
                                </div>
                                
                                {diffData?.loading ? (
                                  <div className="flex items-center justify-center py-8 text-slate-400 gap-3">
                                    <Loader2 size={20} className="animate-spin" />
                                    <span className="text-sm font-bold">AI 正在比對各項成本差異...</span>
                                  </div>
                                ) : (
                                  <div className="prose prose-sm max-w-none prose-slate bg-white p-4 rounded-xl border border-slate-200">
                                    <Markdown remarkPlugins={[remarkGfm]}>{diffData?.text || ''}</Markdown>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Alternatives Modal */}
      <AnimatePresence>
        {showAlternativesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                <div className="flex items-center gap-3 text-amber-800">
                  <Lightbulb size={24} className="text-amber-600" />
                  <h2 className="text-xl font-black">AI 推薦替代產品與型號</h2>
                </div>
                <button 
                  onClick={() => setShowAlternativesModal(false)}
                  className="p-2 text-amber-600 hover:bg-amber-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                {isFetchingAlternatives ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4" />
                    <p className="font-bold animate-pulse">AI 正在為您搜尋最具成本競爭力的替代方案...</p>
                  </div>
                ) : alternatives.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Lightbulb size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-bold">目前沒有推薦的替代方案</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alternatives.map((alt, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">
                                #{index + 1}
                              </span>
                              <h3 className="text-lg font-black text-slate-800">
                                {alt.name}
                              </h3>
                            </div>
                            <p className="text-sm font-bold text-slate-500 mb-3">型號：{alt.model}</p>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <p className="text-sm text-slate-700 leading-relaxed">
                                <span className="font-bold text-slate-900">推薦原因：</span>{alt.reason}
                              </p>
                            </div>
                          </div>
                          <div className="md:text-right">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">預估單價</p>
                            <p className="text-2xl font-black text-amber-600">${alt.estimatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recommended Vendors Modal */}
      <AnimatePresence>
        {showRecommendedVendorsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50">
                <div className="flex items-center gap-3 text-indigo-800">
                  <Building2 size={24} className="text-indigo-600" />
                  <h2 className="text-xl font-black">AI 推薦優質廠商</h2>
                </div>
                <button 
                  onClick={() => setShowRecommendedVendorsModal(false)}
                  className="p-2 text-indigo-600 hover:bg-indigo-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                {isFetchingRecommendedVendors ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
                    <p className="font-bold animate-pulse">AI 正在為您搜尋前三大優質推薦廠商...</p>
                  </div>
                ) : recommendedVendors.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-bold">目前沒有推薦的廠商</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendedVendors.map((vendor, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                                TOP {index + 1}
                              </span>
                              <h3 className="text-xl font-black text-slate-800">
                                {vendor.name}
                              </h3>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-sm text-slate-700 leading-relaxed">
                                <span className="font-bold text-slate-900">推薦原因：</span>{vendor.reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Saved Projects Modal */}
      <AnimatePresence>
        {showSavedProjectsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3 text-slate-800">
                  <FolderOpen size={24} className="text-blue-600" />
                  <h2 className="text-xl font-black">歷史購案紀錄</h2>
                </div>
                <button 
                  onClick={() => setShowSavedProjectsModal(false)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                {savedProjects.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-bold">目前沒有任何歷史紀錄</p>
                    <p className="text-sm mt-2">完成購案品項與細節確認後，系統會自動儲存紀錄。</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedProjects.map((project, index) => (
                      <div key={project.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all group">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                              #{savedProjects.length - index}
                            </span>
                            <span className="text-sm text-slate-500">
                              {new Date(project.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-slate-800">
                            {project.projectName}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            品項：{project.itemName || '未填寫'}
                          </p>
                        </div>
                        <button
                          onClick={() => loadProject(project)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        >
                          載入此紀錄
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
