import React, { useState, useRef } from "react";
import { 
  Vendor, CostItem, ConsolidatedSpec, CostHistoryEntry, 
  AlternativeProduct, RecommendedVendor, Phase2State, Phase2AlignedRow, 
  SavedProject, Phase3State
} from "@/types/procurement";
import { INITIAL_VENDORS } from "@/lib/constants";

export function useProcurementStates() {
  // 頁籤與策略
  const [activeTab, setActiveTab] = useState<'phase1' | 'phase2' | 'phase3'>('phase1');
  const [strategy, setStrategy] = useState<'cost-first' | 'quality-first'>('cost-first');

  // 品項與專案資訊
  const [itemName, setItemName] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemChatMessages, setItemChatMessages] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [itemChatInput, setItemChatInput] = useState('');
  const [isItemChatLoading, setIsItemChatLoading] = useState(false);
  const [proposedItemDescription, setProposedItemDescription] = useState('');
  const [confirmedItemDescription, setConfirmedItemDescription] = useState('');
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

  // 廠商與報價
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [aiEstimatedPrice, setAiEstimatedPrice] = useState<number | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostItem[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);

  // 規格彙總
  const [supplementarySpecs, setSupplementarySpecs] = useState<string[]>(['']);
  const [quoteTimeframe, setQuoteTimeframe] = useState<string>('');
  const [consolidatedSpecs, setConsolidatedSpecs] = useState<ConsolidatedSpec[]>([]);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [showSpecSummary, setShowSpecSummary] = useState(false);
  const [isSpecsConfirmed, setIsSpecsConfirmed] = useState(false);
  const [consolidationError, setConsolidationError] = useState<string | null>(null);
  const [editingSpecIndex, setEditingSpecIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // 對話狀態
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [overallChatMessages, setOverallChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [overallChatInput, setOverallChatInput] = useState('');
  const [isOverallChatLoading, setIsOverallChatLoading] = useState(false);
  const [showOverallChat, setShowOverallChat] = useState(true);

  // 歷史與比對
  const [costHistory, setCostHistory] = useState<CostHistoryEntry[]>([]);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);
  const [diffExplanations, setDiffExplanations] = useState<Record<string, { loading: boolean, text: string }>>({});
  const [showVendorSection, setShowVendorSection] = useState(true);

  // 儲存與推薦
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

  // 第二階段與第三階段
  const [phase2, setPhase2] = useState<Phase2State | null>(null);
  const [phase2Error, setPhase2Error] = useState<string | null>(null);
  const [isPhase2Parsing, setIsPhase2Parsing] = useState(false);
  const [isPhase2Aligning, setIsPhase2Aligning] = useState(false);
  const [isPhase2Negotiating, setIsPhase2Negotiating] = useState(false);
  const [selectedAnalysisItem, setSelectedAnalysisItem] = useState<Phase2AlignedRow | null>(null);
  const [phase2AnalysisError, setPhase2AnalysisError] = useState<string | null>(null);
  const [isPhase2AnalysisLoading, setIsPhase2AnalysisLoading] = useState(false);
  const [phase3, setPhase3] = useState<Phase3State>({
    isMerged: false,
    justifications: {},
    isGeneratingJustification: false
  });
  const [expandedNegotiationItems, setExpandedNegotiationItems] = useState<string[]>([]);
  const [isPhase2ChatLoading, setIsPhase2ChatLoading] = useState(false);
  const [phase2ChatInput, setPhase2ChatInput] = useState('');

  // Refs
  const vendorPdfInputRef = useRef<HTMLInputElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const confirmedItemRef = useRef<HTMLDivElement>(null);
  const aiInsightsRef = useRef<HTMLDivElement>(null);
  const historyImportRef = useRef<HTMLInputElement>(null);

  return {
    activeTab, setActiveTab, strategy, setStrategy,
    itemName, setItemName, isItemModalOpen, setIsItemModalOpen,
    itemChatMessages, setItemChatMessages, itemChatInput, setItemChatInput,
    isItemChatLoading, setIsItemChatLoading, proposedItemDescription, setProposedItemDescription,
    confirmedItemDescription, setConfirmedItemDescription, projectName, setProjectName,
    showProjectDetails, setShowProjectDetails, showProcurementInputs, setShowProcurementInputs,
    docNumber, setDocNumber, department, setDepartment, section, setSection,
    applicant, setApplicant, budgetAmount, setBudgetAmount,
    handlingSection, setHandlingSection, handler, setHandler, totalQty, setTotalQty,
    vendors, setVendors, aiInsights, setAiInsights, isAnalyzing, setIsAnalyzing,
    specFile, setSpecFile, aiEstimatedPrice, setAiEstimatedPrice,
    costBreakdown, setCostBreakdown, showBreakdown, setShowBreakdown,
    showAiInsights, setShowAiInsights, supplementarySpecs, setSupplementarySpecs,
    quoteTimeframe, setQuoteTimeframe, consolidatedSpecs, setConsolidatedSpecs,
    isConsolidating, setIsConsolidating, showSpecSummary, setShowSpecSummary,
    isSpecsConfirmed, setIsSpecsConfirmed, consolidationError, setConsolidationError,
    editingSpecIndex, setEditingSpecIndex, editingContent, setEditingContent,
    activeChatId, setActiveChatId, chatMessages, setChatMessages,
    chatInput, setChatInput, isChatLoading, setIsChatLoading,
    overallChatMessages, setOverallChatMessages, overallChatInput, setOverallChatInput,
    isOverallChatLoading, setIsOverallChatLoading, showOverallChat, setShowOverallChat,
    costHistory, setCostHistory, showDiffModal, setShowDiffModal,
    expandedDiffId, setExpandedDiffId, diffExplanations, setDiffExplanations,
    showVendorSection, setShowVendorSection, savedProjects, setSavedProjects,
    showSavedProjectsModal, setShowSavedProjectsModal, currentProjectId, setCurrentProjectId,
    historyFeedback, setHistoryFeedback, alternatives, setAlternatives,
    showAlternativesModal, setShowAlternativesModal, isFetchingAlternatives, setIsFetchingAlternatives,
    recommendedVendors, setRecommendedVendors, showRecommendedVendorsModal, setShowRecommendedVendorsModal,
    isFetchingRecommendedVendors, setIsFetchingRecommendedVendors,
    phase2, setPhase2, phase2Error, setPhase2Error,
    isPhase2Parsing, setIsPhase2Parsing, isPhase2Aligning, setIsPhase2Aligning,
    isPhase2Negotiating, setIsPhase2Negotiating, selectedAnalysisItem, setSelectedAnalysisItem,
    phase2AnalysisError, setPhase2AnalysisError, isPhase2AnalysisLoading, setIsPhase2AnalysisLoading,
    phase3, setPhase3, expandedNegotiationItems, setExpandedNegotiationItems,
    isPhase2ChatLoading, setIsPhase2ChatLoading, phase2ChatInput, setPhase2ChatInput,
    vendorPdfInputRef, appRef, confirmedItemRef, aiInsightsRef, historyImportRef
  };
}
