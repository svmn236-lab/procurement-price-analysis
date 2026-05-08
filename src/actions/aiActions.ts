'use server';

import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import {
  CostItem, VendorPdfLineItem, Phase2AlignedRow, NegotiationRecord,
  AlternativeProduct, RecommendedVendor, ConsolidatedSpec
} from "@/types/procurement";

const getGenAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY });

const GEMINI_MODEL = 'gemini-3-flash-preview';

/**
 * Utility to extract JSON array from text
 */
function extractJsonArrayFromText(text: string): any[] {
  try {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      return JSON.parse(text.substring(start, end + 1));
    }
    return [];
  } catch (e) {
    console.error('Failed to extract JSON array:', e);
    return [];
  }
}

/**
 * [終極修復版] 單一請求架構：Excel 批次對齊
 * 接收完整的陣列，一次性向 AI 索取所有細項的分析結果，並強制定義回傳 Schema
 */
export async function alignExcelQuoteAction(
  excelRows: any[],
  aiContext: any
): Promise<any[]> {
  // 🚨 防呆機制：如果傳進來的是空的，直接回傳空陣列，連 API 都不用叫
  if (!excelRows || excelRows.length === 0) return [];

  const ai = getGenAI();

  console.log("🚨 紀錄：成功觸發單一請求版 alignExcelQuoteAction！本次資料長度是：", excelRows.length);

  const prompt = `你是一位資深採購稽核與成本分析專家。
請「一次性」分析以下 Excel 報價單的所有項目，並參考提供的「AI 成本基準」進行對齊與估價。

【AI 成本基準 (參考資訊)】：
${JSON.stringify(aiContext, null, 2)}

【需分析的報價單項目 (共 ${excelRows.length} 筆)】：
${JSON.stringify(excelRows, null, 2)}

任務要求：
1. 針對每一個項目，給予一個「AI 合理預估價 (aiReasonableEstimate)」。
2. 分配 category, groupId, groupName。
3. 提供 calculationLogic (估算邏輯) 與 consultantAnalysis (顧問建議)。
4. 必須回傳一個 JSON 物件，格式為 {"rows": [...]}。
5. rows 陣列的長度必須剛好等於 ${excelRows.length} 筆，不可遺漏。`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      // 強制約定回傳格式，確保絕對不會解析失敗
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
                groupId: { type: Type.NUMBER },
                groupName: { type: Type.STRING },
              },
              required: ['category', 'item', 'vendorQuote', 'aiReasonableEstimate', 'calculationLogic', 'consultantAnalysis', 'groupId', 'groupName']
            }
          }
        },
        required: ['rows']
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{"rows": []}');
    return data.rows || [];
  } catch (error) {
    console.error('JSON 解析錯誤:', error);
    return [];
  }
}

export async function parseAndAlignVendorQuoteAction(
  base64Pdf: string,
  aiContext: {
    aiEstimatedPrice: number | null;
    totalQty: number | string;
    itemDescription: string;
    quoteTimeframe: string;
    costBreakdown: CostItem[];
    aiInsights: string;
  }
): Promise<any[]> {
  const ai = getGenAI();

  const prompt = `你是一位資深採購稽核與成本分析專家。
請閱讀附件 PDF 報價單，並參考提供的「AI 成本基準」，直接產出對齊後的分析結果。

AI 成本基準 (參考資訊)：
${JSON.stringify(aiContext, null, 2)}

任務要求：
1. 萃取報價單：從 PDF 中提取所有細項名稱與廠商報價金額。
2. 基準對齊：針對每個萃取出的細項，根據 AI 成本基準給予一個「AI 合理預估價 (aiReasonableEstimate)」。
3. 自動分類：為每個項目分配 category, groupId, groupName。
4. 深度分析：提供每個項目的 calculationLogic (估算邏輯) 與 consultantAnalysis (顧問建議)。

輸出要求：
- 必須回傳一個 JSON 物件，格式為 {"rows": [...]}。
- 每個 row 包含：category, item, vendorQuote, aiReasonableEstimate, calculationLogic, consultantAnalysis, groupId, groupName。
- 請一次性完成所有項目的解析與分析，嚴禁分次。
- 直接輸出純 JSON，不要包含 Markdown 標籤。`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
      { text: prompt },
    ],
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
                groupId: { type: Type.NUMBER },
                groupName: { type: Type.STRING },
              },
              required: ['category', 'item', 'vendorQuote', 'aiReasonableEstimate', 'calculationLogic', 'consultantAnalysis', 'groupId', 'groupName']
            }
          }
        },
        required: ['rows']
      }
    }
  });

  const data = JSON.parse(response.text || '{"rows": []}');
  return data.rows || [];
}

export async function parseVendorQuotePdfAction(base64Pdf: string): Promise<VendorPdfLineItem[]> {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
      { text: '請閱讀附件 PDF 並提取出所有的【成本細項】與對應的【報價金額】。' },
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: '你是一個專業的採購稽核員。請直接輸出純 JSON 陣列格式，格式範例：[{"item": "加工費", "amount": 1500}]',
    },
  });
  const text = response.text || '';
  return extractJsonArrayFromText(text);
}

export async function runAiAnalysisAction(
  itemName: string,
  totalQty: number | string,
  vendors: any[],
  specsContext: string,
  quoteTimeframe: string,
  learningContext: string
): Promise<any> {
  const ai = getGenAI();
  const prompt = `你是一位專業的採購策略分析師。
請分析購案「${itemName}」，總數量 ${totalQty}，有效報價區間 ${quoteTimeframe}。
規格脈絡：${specsContext}
現有報價：${JSON.stringify(vendors)}
${learningContext}

請產出：
1. 談判策略與風險提示 (Markdown)
2. 合理市場單價
3. 成本細項拆解 (包含數學算式)

請以 JSON 格式回傳。`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insights: { type: Type.STRING },
          estimatedPrice: { type: Type.NUMBER },
          breakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                cost: { type: Type.NUMBER },
                basis: { type: Type.STRING },
                explanation: { type: Type.STRING }
              }
            }
          }
        },
        required: ['insights', 'estimatedPrice', 'breakdown']
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function consolidateSpecsAction(
  base64Pdf: string | null,
  mimeType: string | null,
  itemName: string,
  suppSpecsText: string,
  quoteTimeframe: string
): Promise<any> {
  const ai = getGenAI();
  const contents: any[] = [];

  if (base64Pdf && mimeType) {
    contents.push({ inlineData: { data: base64Pdf, mimeType } });
  }

  contents.push({
    text: `
      分析規格文件與補充條件。
      品項：${itemName}
      補充規格：${suppSpecsText}
      時間區間：${quoteTimeframe}
      
      請以 JSON 格式回傳彙整後的規格與總數量：
      {
        "specs": [{"category": "分類", "content": "內容", "source": "來源", "warning": "警告 (選填)"}],
        "totalQuantity": 100
      }
    `
  });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json'
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function fetchAlternativesAction(itemName: string): Promise<AlternativeProduct[]> {
  const ai = getGenAI();
  const prompt = `推薦 5 個「${itemName}」的替代產品。請以 JSON 回傳：{"alternatives": [{"name": "...", "model": "...", "estimatedPrice": 100, "reason": "..."}]}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json'
    }
  });

  const data = JSON.parse(response.text || '{}');
  return data.alternatives || [];
}

export async function fetchRecommendedVendorsAction(itemName: string): Promise<RecommendedVendor[]> {
  const ai = getGenAI();
  const prompt = `推薦 3 家「${itemName}」的供應商。請以 JSON 回傳：{"vendors": [{"name": "...", "reason": "..."}]}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json'
    }
  });

  const data = JSON.parse(response.text || '{}');
  return data.vendors || [];
}

export async function handleChatMessageAction(
  history: { role: 'user' | 'model'; text: string }[],
  userMessage: string,
  context: string,
  systemInstruction: string
): Promise<string> {
  const ai = getGenAI();
  const chat = ai.models.startChat({
    model: GEMINI_MODEL,
    history: history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction
    }
  });

  const result = await chat.sendMessage(`Context: ${context}\n\nUser: ${userMessage}`);
  return result.text || '';
}

export async function generateDiffAnalysisAction(
  newest: any,
  oldEntry: any
): Promise<string> {
  const ai = getGenAI();
  const prompt = `比較新舊成本估算差異：\n新：${JSON.stringify(newest)}\n舊：${JSON.stringify(oldEntry)}\n請以 Markdown 表格回覆。`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
  });

  return response.text || '';
}

export async function alignCostStructuresAction(
  vendorLines: VendorPdfLineItem[],
  aiContext: {
    aiEstimatedPrice: number | null;
    totalQty: number | string;
    itemDescription: string;
    quoteTimeframe: string;
    costBreakdown: CostItem[];
    aiInsights: string;
  }
): Promise<any[]> {
  const ai = getGenAI();
  const inputA = JSON.stringify(aiContext, null, 2);
  const inputB = JSON.stringify(vendorLines, null, 2);

  const prompt = `
你是一位採購成本結構分析專家。請將「輸入 A」的 AI 模擬總成本與分項邏輯，強制依照「輸入 B」的廠商報價項目分類進行重新拆解與配對。

輸入 A：
${inputA}

輸入 B：
${inputB}

輸出要求：
1. 回傳 JSON 陣列，包含：category, item, vendorQuote, aiReasonableEstimate, calculationLogic, consultantAnalysis, groupId, groupName。
2. item 必須與 B 完全一致。
3. groupId 與 groupName 用於歸類相似項目。
`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
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
                groupId: { type: Type.NUMBER },
                groupName: { type: Type.STRING },
              },
              required: ['category', 'item', 'vendorQuote', 'aiReasonableEstimate', 'calculationLogic', 'consultantAnalysis', 'groupId', 'groupName']
            }
          }
        },
        required: ['rows']
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return data.rows || [];
}

export async function batchGeneratePhase2AnalysisAction(
  items: Phase2AlignedRow[],
  itemName: string,
  totalQty: number | string,
  aiEstimatedPrice: number | null,
  costBreakdown: CostItem[],
  quoteTimeframe: string
): Promise<any[]> {
  const ai = getGenAI();

  const prompt = `你是一位資深採購議價顧問。
這是一個包含多個成本項目的 JSON 陣列，請一次性分析所有項目，並回傳一個包含所有結果的 JSON 陣列。

購案背景：
- 購案名稱：${itemName}
- 總數量：${totalQty}
- 有效報價時間區間：${quoteTimeframe}
- AI 成本基準：${JSON.stringify({ aiEstimatedUnitPrice: aiEstimatedPrice, totalQty, costBreakdown }, null, 2)}

待分析項目列表 (JSON Array)：
${JSON.stringify(items, null, 2)}

輸出要求：
1. 必須回傳一個 JSON 物件，格式為 {"analyses": [...]}。
2. "analyses" 陣列中的每個物件必須包含：item, category, calculationLogic, consultantAnalysis。
3. 請確保回傳的陣列長度與輸入的項目列表長度完全一致。
4. 針對每個項目，請根據 AI 成本基準與廠商報價，提供具體的「估算邏輯」與「市場洞察建議」。
5. 不要輸出任何 Markdown 標籤，只輸出純 JSON。`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analyses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                category: { type: Type.STRING },
                calculationLogic: { type: Type.STRING },
                consultantAnalysis: { type: Type.STRING }
              },
              required: ['item', 'category', 'calculationLogic', 'consultantAnalysis']
            }
          }
        },
        required: ['analyses']
      }
    }
  });

  const data = JSON.parse(response.text || '{"analyses": []}');
  return data.analyses || [];
}

export async function generatePhase2NegotiationStrategyAction(
  aligned: Phase2AlignedRow[],
  negotiationRecords: NegotiationRecord[] = []
): Promise<string> {
  const ai = getGenAI();
  const prompt = `你是一位專業的採購談判專家。請生成談判策略建議。
數據：${JSON.stringify(aligned, null, 2)}
紀錄：${JSON.stringify(negotiationRecords, null, 2)}
請提供 Markdown 回覆。`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
  });
  return response.text || '';
}

export async function generateCostJustificationAction(
  targetItems: any[],
  isMergedMode: boolean,
  itemName: string
): Promise<Record<string, string>> {
  const ai = getGenAI();
  const prompt = `為議價結果產出「合理性說明」。
購案：${itemName}
模式：${isMergedMode ? '合併' : '細項'}
資料：${JSON.stringify(targetItems, null, 2)}
回傳 JSON：{ "justifications": { "key": "value" } }`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
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
        required: ['justifications']
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return data.justifications || {};
}

export async function handleGenericChatAction(
  history: { role: 'user' | 'model'; text: string }[],
  userMessage: string,
  context: any,
  systemInstruction: string
): Promise<{ text: string; data?: any }> {
  const ai = getGenAI();
  const chat = ai.models.startChat({
    model: GEMINI_MODEL,
    history: history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction,
      responseMimeType: 'application/json'
    }
  });

  const prompt = `Context: ${JSON.stringify(context)}\n\nUser: ${userMessage}\n\n請以 JSON 格式回覆：{"text": "回覆文字", "data": {...}}`;
  const result = await chat.sendMessage(prompt);
  return JSON.parse(result.text || '{"text": "解析錯誤"}');
}