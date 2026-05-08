"use client";
import React from "react";
import { Scale, Upload, Loader2, AlertTriangle, FileSearch, FileText, Sparkles, ChevronUp, ChevronDown, Save, X, Edit2, Trash2, Bot, Send, User, Lightbulb, RefreshCw } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Phase2State, Phase2AlignedRow, NegotiationRecord } from "@/types/procurement";

interface Phase2ComparisonProps {
  aiEstimatedPrice: number | null;
  totalQty: number | '';
  isPhase2Parsing: boolean;
  isPhase2Aligning: boolean;
  isPhase2Negotiating: boolean;
  vendorPdfInputRef: React.RefObject<HTMLInputElement>;
  handleVendorQuotePdfSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  phase2Error: string | null;
  phase2: Phase2State | undefined;
  handleBatchGeneratePhase2Analysis: () => void;
  isPhase2AnalysisLoading: boolean;
  handleSelectPhase2AnalysisItem: (row: Phase2AlignedRow) => void;
  selectedAnalysisItem: Phase2AlignedRow | null;
  updateRowGrouping: (item: string, groupId: number, groupName: string) => void;
  toggleNegotiationForm: (item: string) => void;
  expandedNegotiationItems: string[];
  handleEditPhase2Row: (item: string, field: string, value: any) => void;
  handleDeletePhase2Row: (item: string) => void;
  handlePhase2QuoteVersionChange: (version: string) => void;
  saveNegotiationRecord: (record: NegotiationRecord) => void;
  regenerateNegotiationStrategy: () => void;
  phase2ChatInput: string;
  setPhase2ChatInput: (val: string) => void;
  handlePhase2ChatMessage: () => void;
  isPhase2ChatLoading: boolean;
  NegotiationForm: React.FC<any>;
}

export const Phase2Comparison: React.FC<Phase2ComparisonProps> = ({
  aiEstimatedPrice,
  totalQty,
  isPhase2Parsing,
  isPhase2Aligning,
  isPhase2Negotiating,
  vendorPdfInputRef,
  handleVendorQuotePdfSelected,
  phase2Error,
  phase2,
  handleBatchGeneratePhase2Analysis,
  isPhase2AnalysisLoading,
  handleSelectPhase2AnalysisItem,
  selectedAnalysisItem,
  updateRowGrouping,
  toggleNegotiationForm,
  expandedNegotiationItems,
  handleEditPhase2Row,
  handleDeletePhase2Row,
  handlePhase2QuoteVersionChange,
  saveNegotiationRecord,
  regenerateNegotiationStrategy,
  phase2ChatInput,
  setPhase2ChatInput,
  handlePhase2ChatMessage,
  isPhase2ChatLoading,
  NegotiationForm,
}) => {
  const [isGroupView, setIsGroupView] = React.useState(false);
  const [editingRowItem, setEditingRowItem] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState<{ item: string; vendorQuote: number; aiEstimate: number } | null>(null);

  const displayRows = React.useMemo(() => {
    if (!phase2?.alignedRows) return [];
    if (!isGroupView) return phase2.alignedRows;

    const groups: Record<string, any> = {};
    phase2.alignedRows.forEach(row => {
      const name = row.groupName || `未分類 (${row.groupId})`;
      if (!groups[name]) {
        groups[name] = {
          item: name,
          groupName: name,
          vendorQuote: 0,
          aiEstimate: 0,
          varianceAmount: 0,
          isGroup: true,
          groupId: row.groupId
        };
      }
      groups[name].vendorQuote += row.vendorQuote;
      groups[name].aiEstimate += row.aiEstimate;
    });

    return Object.values(groups).map(g => {
      const diff = g.vendorQuote - g.aiEstimate;
      return {
        ...g,
        varianceAmount: diff,
        variancePercent: g.aiEstimate !== 0 ? (diff / g.aiEstimate) * 100 : 0
      };
    });
  }, [phase2?.alignedRows, isGroupView]);

  if (aiEstimatedPrice === null) return null;

  return (
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
              上傳廠商報價 (PDF/XLSX) → AI 萃取與對齊 → 差異表與談判策略
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">報價版次</span>
            <select
              value={phase2?.quoteVersion || '第 1 次報價'}
              onChange={(e) => handlePhase2QuoteVersionChange(e.target.value)}
              className="p-2.5 bg-white border border-violet-200 rounded-xl text-sm font-bold text-violet-700 outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            >
              <option value="第 1 次報價">第 1 次報價</option>
              <option value="第 2 次報價">第 2 次報價</option>
              <option value="最終議價版">最終議價版</option>
            </select>
          </div>
          <input
            ref={vendorPdfInputRef}
            type="file"
            accept=".pdf,application/pdf,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleVendorQuotePdfSelected}
          />
          <button
            type="button"
            onClick={() => vendorPdfInputRef.current?.click()}
            disabled={isPhase2Parsing || isPhase2Aligning || isPhase2Negotiating}
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
            上傳廠商報價單
          </button>
        </div>
      </div>

      {(isPhase2Parsing || isPhase2Aligning || isPhase2Negotiating) && (
        <div className="mb-4 flex flex-wrap gap-3 text-xs font-semibold text-violet-900">
          {isPhase2Parsing && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-violet-200 shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              解析報價單（Gemini 視覺萃取）…
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
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-800">
                <FileText className="w-5 h-5 text-violet-600" />
                <h4 className="text-lg font-black">差異分析比較表</h4>
              </div>
              <label className="flex items-center gap-2 cursor-pointer group bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:border-violet-300 transition-all">
                <input
                  type="checkbox"
                  checked={isGroupView}
                  onChange={(e) => setIsGroupView(e.target.checked)}
                  className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                />
                <span className="text-sm font-bold text-slate-600 group-hover:text-violet-700">切換為分類合併檢視</span>
              </label>
            </div>
            {!isGroupView && (
              <button
                onClick={() => handleBatchGeneratePhase2Analysis()}
                disabled={isPhase2AnalysisLoading}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                  isPhase2AnalysisLoading 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                    : "bg-violet-600 text-white hover:bg-violet-700 active:scale-95"
                )}
              >
                {isPhase2AnalysisLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                AI 批次分析所有細項
              </button>
            )}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-violet-100 bg-white shadow-inner mb-8">
            <table className="w-full text-left text-sm min-w-[900px]">
              <thead>
                <tr className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                  <th className="p-4 font-bold rounded-tl-2xl">{isGroupView ? '大分類' : '成本細項'}</th>
                  <th className="p-4 font-bold">廠商報價</th>
                  <th className="p-4 font-bold">AI 合理預估</th>
                  <th className="p-4 font-bold">差異金額</th>
                  <th className="p-4 font-bold">差異百分比</th>
                  {!isGroupView && <th className="p-4 font-bold">分類設定</th>}
                  {!isGroupView && <th className="p-4 font-bold">議價操作</th>}
                  {!isGroupView && <th className="p-4 font-bold rounded-tr-2xl">操作</th>}
                  {isGroupView && <th className="p-4 font-bold rounded-tr-2xl" colSpan={3}>備註</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.map((row, idx) => {
                  const vendorHighVersusAi =
                    row.aiEstimate > 0
                      ? row.vendorQuote > row.aiEstimate * 1.1
                      : row.vendorQuote > 0;
                  const negotiationRecord = !row.isGroup ? phase2.negotiationRecords?.find(r => r.item === row.item) : null;
                  const isExpanded = !row.isGroup && expandedNegotiationItems?.includes(row.item);

                  return (
                    <React.Fragment key={`${row.item}-${idx}`}>
                      <tr className={cn('transition-colors', vendorHighVersusAi ? 'bg-red-50/90 hover:bg-red-50' : 'hover:bg-slate-50/80')}>
                        <td className={cn('p-4 font-bold', vendorHighVersusAi ? 'text-red-900' : 'text-slate-800')}>
                          {row.item}
                        </td>
                        <td className={cn('p-4 font-mono font-semibold', vendorHighVersusAi ? 'text-red-700' : 'text-slate-700')}>
                          {editingRowItem === row.item ? (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500">$</span>
                              <input
                                type="number"
                                value={editFormData?.vendorQuote ?? row.vendorQuote}
                                onChange={(e) => setEditFormData({
                                  item: row.item,
                                  vendorQuote: Number(e.target.value) || 0,
                                  aiEstimate: row.aiEstimate
                                })}
                                className="w-32 p-2 text-sm border border-violet-300 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none shadow-sm"
                                autoFocus
                              />
                            </div>
                          ) : (
                            `$${row.vendorQuote.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          )}
                        </td>
                        <td className="p-4">
                          {!row.isGroup ? (
                            <button
                              type="button"
                              onClick={() => handleSelectPhase2AnalysisItem(row as Phase2AlignedRow)}
                              disabled={isPhase2AnalysisLoading}
                              className={cn('text-left rounded-lg transition-colors cursor-pointer', selectedAnalysisItem?.item === row.item ? 'bg-emerald-50/80' : 'hover:bg-slate-50')}
                              title="點擊查看分析"
                            >
                              <div className="font-mono text-emerald-700 font-semibold underline underline-offset-4 decoration-emerald-300 hover:text-emerald-800">
                                ${row.aiEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1 italic">點擊查看分析</div>
                            </button>
                          ) : (
                            <div className="font-mono text-emerald-700 font-semibold">
                              ${row.aiEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </td>
                        <td className={cn('p-4 font-mono font-bold', row.varianceAmount > 0 ? 'text-red-600' : row.varianceAmount < 0 ? 'text-emerald-600' : 'text-slate-600')}>
                          {row.varianceAmount > 0 ? '+' : ''}${row.varianceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 font-mono text-slate-700">
                          {row.variancePercent !== null ? `${row.variancePercent > 0 ? '+' : ''}${row.variancePercent.toFixed(1)}%` : '—'}
                        </td>
                        {!isGroupView && (
                          <>
                            <td className="p-4">
                              <div className="flex flex-col gap-2">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">[{row.groupId}] {row.groupName}</div>
                                <div className="flex gap-1 items-center">
                                  <input
                                    type="number"
                                    min="1"
                                    value={row.groupId}
                                    onChange={(e) => updateRowGrouping(row.item, parseInt(e.target.value) || 1, row.groupName)}
                                    className="w-10 p-1 text-[10px] border border-slate-200 rounded text-center outline-none focus:border-violet-400"
                                  />
                                  <input
                                    type="text"
                                    value={row.groupName}
                                    onChange={(e) => updateRowGrouping(row.item, row.groupId, e.target.value)}
                                    placeholder="分類名稱"
                                    className="flex-1 p-1 text-[10px] border border-slate-200 rounded outline-none focus:border-violet-400"
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => toggleNegotiationForm(row.item)}
                                className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1', isExpanded ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                              >
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                {negotiationRecord ? '編輯議價' : '開始議價'}
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {editingRowItem === row.item ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        if (editFormData) handleEditPhase2Row(row.item, 'vendorQuote', editFormData.vendorQuote);
                                        setEditingRowItem(null);
                                        setEditFormData(null);
                                      }}
                                      className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
                                      title="儲存"
                                    >
                                      <Save size={16} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingRowItem(null);
                                        setEditFormData(null);
                                      }}
                                      className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                      title="取消"
                                    >
                                      <X size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingRowItem(row.item);
                                        setEditFormData({ item: row.item, vendorQuote: row.vendorQuote, aiEstimate: row.aiEstimate });
                                      }}
                                      className="p-2 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-lg transition-colors"
                                      title="編輯"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (window.confirm('確定要移除此報價細項嗎？')) {
                                          handleDeletePhase2Row(row.item);
                                        }
                                      }}
                                      className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                      title="刪除"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                        {isGroupView && <td colSpan={3} className="p-4 text-xs italic text-slate-400">合併檢視模式（不可編輯）</td>}
                      </tr>
                      {!isGroupView && isExpanded && (
                        <tr className="bg-violet-50/30">
                          <td colSpan={8} className="p-4">
                            <NegotiationForm
                              item={row.item}
                              currentRecord={negotiationRecord}
                              onSave={(record: NegotiationRecord) => saveNegotiationRecord(record)}
                              onCancel={() => toggleNegotiationForm(row.item)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white font-black text-base border-t-2 border-slate-600">
                  <td className="p-4 rounded-bl-2xl">總計金額</td>
                  <td className="p-4 font-mono">${phase2.alignedRows.reduce((sum, row) => sum + row.vendorQuote, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="p-4 font-mono">${phase2.alignedRows.reduce((sum, row) => sum + row.aiEstimate, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={cn('p-4 font-mono', phase2.alignedRows.reduce((sum, row) => sum + row.varianceAmount, 0) > 0 ? 'text-red-300' : 'text-emerald-300')}>
                    {phase2.alignedRows.reduce((sum, row) => sum + row.varianceAmount, 0) > 0 ? '+' : ''}${phase2.alignedRows.reduce((sum, row) => sum + row.varianceAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={isGroupView ? 2 : 4} className="p-4 rounded-br-2xl text-slate-300 text-xs italic">
                    {isGroupView ? '分類合併總覽' : '廠商 vs AI 報價差異總結'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {phase2 && (
        <div className="mb-8 bg-white border border-violet-200 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-black text-violet-900 flex items-center gap-2"><Bot className="w-5 h-5" />議價專屬 AI 助理</h4>
            <button onClick={() => regenerateNegotiationStrategy()} disabled={isPhase2Negotiating} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all">
              {isPhase2Negotiating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}產生/更新談判策略
            </button>
          </div>
          <div className="mb-4 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-4 bg-slate-50">
            {phase2.phase2ChatMessages?.map((msg, idx) => (
              <div key={idx} className={cn('flex gap-3 mb-4', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0"><Bot size={16} className="text-violet-600" /></div>}
                <div className={cn('max-w-[80%] p-3 rounded-2xl text-sm', msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-800')}>
                  <Markdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">{msg.text}</Markdown>
                </div>
                {msg.role === 'user' && <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0"><User size={16} className="text-slate-600" /></div>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={phase2ChatInput} onChange={(e) => setPhase2ChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handlePhase2ChatMessage()} placeholder="詢問議價相關問題..." className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-400" disabled={isPhase2ChatLoading} />
            <button onClick={() => handlePhase2ChatMessage()} disabled={!phase2ChatInput.trim() || isPhase2ChatLoading} className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all"><Send size={16} />發送</button>
          </div>
        </div>
      )}

      {phase2?.negotiationStrategy && (
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 shadow-md">
          <h4 className="text-lg font-black text-amber-900 mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5" />智能談判策略</h4>
          <div className="prose prose-sm max-w-none prose-headings:text-amber-900 prose-p:text-slate-700"><Markdown remarkPlugins={[remarkGfm]}>{phase2.negotiationStrategy}</Markdown></div>
        </div>
      )}
    </section>
  );
};
