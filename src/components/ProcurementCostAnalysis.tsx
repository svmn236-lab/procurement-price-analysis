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
  Lightbulb,
  Building2
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

// --- Types (已整合至單一檔案) ---
interface Vendor { id: string; name: string; price: number; }
interface CostItem { item: string; cost: number; basis: string; explanation: string; customCondition?: string; isUpdating?: boolean; }
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
}

const INITIAL_VENDORS: Vendor[] = [
  { id: '1', name: '', price: 0 },
];

export default function ProcurementCostAnalysis() {
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

  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [isFetchingAlternatives, setIsFetchingAlternatives] = useState(false);

  const [recommendedVendors, setRecommendedVendors] = useState<RecommendedVendor[]>([]);
  const [showRecommendedVendorsModal, setShowRecommendedVendorsModal] = useState(false);
  const [isFetchingRecommendedVendors, setIsFetchingRecommendedVendors] = useState(false);

  const appRef = React.useRef<HTMLDivElement>(null);
  const confirmedItemRef = React.useRef<HTMLDivElement>(null);
  const aiInsightsRef = React.useRef<HTMLDivElement>(null);

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

  const chartData = useMemo(() => {
    const data = [...vendors].map(v => ({ ...v, type: 'vendor' }));
    if (aiEstimatedPrice !== null) {
      data.push({ id: 'ai-estimate', name: 'AI 估算報價', price: aiEstimatedPrice, type: 'ai' } as any);
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
  };

  const saveCurrentProject = (desc?: string, overrides?: Partial<SavedProject>) => {
    setSavedProjects(prev => {
      const projectId = currentProjectId || Date.now().toString();
      
      const projectToSave: SavedProject = {
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
        ...overrides
      };

      const existingIndex = prev.findIndex(p => p.id === projectId);
      if (existingIndex >= 0) {
        const newProjects = [...prev];
        newProjects[existingIndex] = projectToSave;
        return newProjects;
      } else {
        return [projectToSave, ...prev].slice(0, 5);
      }
    });

    if (!currentProjectId) {
      setCurrentProjectId(Date.now().toString()); // It's fine if it's slightly off from the actual ID, but better to set it properly. Wait, let's just use a ref or update state.
    }
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
    setShowSavedProjectsModal(false);
    setCurrentProjectId(project.id);
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
      const parts: any[] = [];
      
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
    } catch (error: any) {
      console.error('Consolidation Error:', error);
      setConsolidatedSpecs([]);
      if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
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
                    item: { type: Type.STRING, description: "成本分項名稱 (中文)" },
                    cost: { type: Type.NUMBER, description: "該分項的預估成本" },
                    basis: { type: Type.STRING, description: "計算基礎 (中文)" },
                    explanation: { type: Type.STRING, description: "計算說明：先寫出包含「實際數字」的數學公式（例如：1000 * 5 = 5000，不能只有文字），後面再摘要各個數字的簡要說明 (中文)" }
                  },
                  required: ["item", "cost", "basis", "explanation"]
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
          costHistory: newHistory
        });
        
        return newHistory;
      });
    } catch (error: any) {
      console.error('AI Analysis Error:', error);
      let errorMessage = '分析過程中發生錯誤，請檢查網路連線或 API Key 設置。';
      if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
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

    } catch (error: any) {
      console.error('Overall Chat Error:', error);
      let errorMessage = '通訊發生錯誤，請稍後再試。';
      if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
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
    } catch (error: any) {
      console.error('Chat Error:', error);
      let errorMessage = '通訊發生錯誤，請稍後再試。';
      if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inputs */}
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
                                  {chartData.map((entry: any, index) => {
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

          {/* Right Column: Results */}
          <div className="lg:col-span-8 space-y-8">
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

            {/* AI Cost Breakdown Section */}
            {aiEstimatedPrice !== null && (
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
                                <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                                  暫無詳細成本數據
                                </td>
                              </tr>
                            )}
                            {costBreakdown.length > 0 && (
                              <tr className="bg-amber-100 font-black text-lg border-t-2 border-amber-200">
                                <td className="p-4 text-amber-900">總計</td>
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

            {/* Overall AI Chat Section */}
            {aiInsights && (
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
