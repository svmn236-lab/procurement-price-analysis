export interface Vendor { id: string; name: string; price: number; }

export interface CostItem {
  category: string;
  item: string;
  cost: number;
  basis: string;
  explanation: string;
  customCondition?: string;
  isUpdating?: boolean;
}

export interface ConsolidatedSpec {
  category: string;
  content: string;
  source: string;
  hasContradiction: boolean;
  warningMessage?: string;
  rejectedContent?: string;
}

export interface CostHistoryEntry {
  id: string;
  timestamp: number;
  totalPrice: number;
  breakdown: CostItem[];
  aiInsights: string;
}

export interface AlternativeProduct {
  name: string;
  model: string;
  estimatedPrice: number;
  reason: string;
}

export interface RecommendedVendor {
  name: string;
  reason: string;
}

export interface VendorPdfLineItem {
  item: string;
  amount: number;
}

export interface NegotiationRecord {
  item: string;
  negotiatedPrice: number;
  isAccepted: boolean;
  reason: string;
  timestamp: number;
}

export interface Phase2AlignedRow {
  category: string;
  item: string;
  vendorQuote: number;
  aiEstimate: number;
  calculationLogic: string;
  consultantAnalysis: string;
  varianceAmount: number;
  variancePercent: number | null;
  groupId: number;
  groupName: string;
}

export interface Phase2State {
  vendorPdfFileName: string | null;
  vendorPdfParsedLines: VendorPdfLineItem[];
  alignedRows: Phase2AlignedRow[];
  negotiationStrategy: string;
  negotiationRecords: NegotiationRecord[];
  phase2ChatMessages: { role: 'user' | 'assistant', text: string }[];
}

export interface Phase3State {
  isMerged: boolean;
  justifications: Record<string, string>;
  isGeneratingJustification: boolean;
}

export interface SavedProject {
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
  phase2?: Phase2State;
  phase3?: Phase3State;
}

export interface HistoryExcelRow {
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
