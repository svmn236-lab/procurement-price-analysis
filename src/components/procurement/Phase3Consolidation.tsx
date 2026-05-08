"use client";
import React from "react";
import { BarChart2, Plus, RefreshCw, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LayoutList, Loader2, CheckCircle2, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Phase2State, Phase3State } from "@/types/procurement";

interface Phase3ConsolidationProps {
  phase3: Phase3State;
  handleTogglePhase3Merge: (merged: boolean) => void;
  regenerateAllPhase3Justifications: () => void;
  phase2: Phase2State | undefined;
  budgetAmount: number | '';
  aggregatePhase3Data: (phase2: Phase2State, isMerged: boolean) => any[];
}

export const Phase3Consolidation: React.FC<Phase3ConsolidationProps> = ({
  phase3,
  handleTogglePhase3Merge,
  regenerateAllPhase3Justifications,
  phase2,
  budgetAmount,
  aggregatePhase3Data,
}) => {
  return (
    <section className="space-y-8">
      {/* 頂部圖表區 */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl border border-emerald-200">
              <BarChart2 size={24} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">價格組成與議價成果堆疊圖</h3>
              <p className="text-xs text-slate-500 mt-0.5">展示從最初預算、各項成本堆疊，到最終議價後總額 (Commit)</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input type="checkbox" checked={phase3.isMerged} onChange={(e) => handleTogglePhase3Merge(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </div>
              <span className="text-sm font-bold text-slate-600 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                <Plus className={cn("w-4 h-4 transition-transform", phase3.isMerged ? "rotate-45" : "rotate-0")} />
                分類合併模式
              </span>
            </label>
            <div className="w-px h-6 bg-slate-300 mx-2" />
            <button onClick={regenerateAllPhase3Justifications} disabled={phase3.isGeneratingJustification || !phase2} className="btn-ghost px-3">
              <RefreshCw size={14} className={phase3.isGeneratingJustification ? "animate-spin" : ""} />
              更新 AI 辯護
            </button>
          </div>
        </div>

        {phase2 ? (
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: '原始預算', price: Number(budgetAmount) || 0, type: 'budget' }, ...aggregatePhase3Data(phase2, phase3.isMerged).map(d => ({ name: d.name, price: d.finalPrice, vendorQuote: d.vendorQuote, type: 'item' })), { name: '最終成交價', price: aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.finalPrice, 0), type: 'commit' }]} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} angle={-25} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => `$${val.toLocaleString()}`} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [`$${value.toLocaleString()}`, '金額']} />
                <Bar dataKey="price" radius={[8, 8, 0, 0]} barSize={40}>
                  {[{ name: '原始預算', type: 'budget' }, ...aggregatePhase3Data(phase2, phase3.isMerged), { name: '最終成交價', type: 'commit' }].map((entry, index) => {
                    const itemType = (entry as { type?: string }).type;
                    let fill = '#10b981'; if (itemType === 'budget') fill = '#3b82f6'; if (itemType === 'commit') fill = '#059669'; if (itemType === 'item') fill = '#6366f1';
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
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200">{row.category}</span>
                  </td>
                  {!phase3.isMerged && <td className="p-5 font-bold text-slate-800">{row.name}</td>}
                  <td className="p-5 text-right font-mono text-slate-400 group-hover:text-slate-600">${row.vendorQuote.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-5 text-right font-mono font-black text-emerald-700 text-base">${row.finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-5 min-w-[300px]">
                    {phase3.justifications[row.name] ? (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-slate-600 leading-relaxed italic">「{phase3.justifications[row.name]}」</p>
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
                  <td colSpan={phase3.isMerged ? 4 : 5} className="p-12 text-center text-slate-400 italic">暫無報表數據，請先完成議價。</td>
                </tr>
              )}
              {phase2 && (
                <tr className="bg-emerald-50/50 font-black text-emerald-900 border-t-2 border-emerald-100">
                  <td className="p-5" colSpan={phase3.isMerged ? 1 : 2}>總計成交額 (Commit)</td>
                  <td className="p-5 text-right font-mono">${aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.vendorQuote, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-5 text-right font-mono text-xl">${aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.finalPrice, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-5 text-emerald-600 text-xs italic">相較廠商初始總報價已爭取到約 {(((aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.vendorQuote, 0) - aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.finalPrice, 0)) / aggregatePhase3Data(phase2, phase3.isMerged).reduce((s, d) => s + d.vendorQuote, 1)) * 100).toFixed(1)}% 的降幅空間</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
