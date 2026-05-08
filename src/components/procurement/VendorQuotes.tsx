"use client";
import React from "react";
import { Plus, ChevronUp, ChevronDown, Trash2, RefreshCw, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Vendor, RecommendedVendor } from "@/types/procurement";

interface VendorQuotesProps {
  confirmedItemDescription: string;
  fetchRecommendedVendors: () => void;
  isFetchingRecommendedVendors: boolean;
  recommendedVendors: RecommendedVendor[];
  setShowRecommendedVendorsModal: (show: boolean) => void;
  handleAddVendor: () => void;
  showVendorSection: boolean;
  setShowVendorSection: (show: boolean) => void;
  vendors: Vendor[];
  handleVendorChange: (id: string, field: 'name' | 'price', val: string | number) => void;
  handleRemoveVendor: (id: string) => void;
  chartData: any[];
}

export const VendorQuotes: React.FC<VendorQuotesProps> = ({
  confirmedItemDescription,
  fetchRecommendedVendors,
  isFetchingRecommendedVendors,
  recommendedVendors,
  setShowRecommendedVendorsModal,
  handleAddVendor,
  showVendorSection,
  setShowVendorSection,
  vendors,
  handleVendorChange,
  handleRemoveVendor,
  chartData,
}) => {
  return (
    <div className="card-base p-6 bg-slate-50/30">
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
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-primary transition-colors"
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
                      className="w-1/2 p-2.5 border border-slate-200 rounded-lg text-sm focus:border-brand-primary outline-none"
                    />
                    <div className="relative w-1/2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        placeholder="單價"
                        value={vendor.price || ''}
                        onChange={(e) => handleVendorChange(vendor.id, 'price', Number(e.target.value))}
                        className="w-full p-2.5 pl-6 border rounded-lg text-sm focus:border-brand-primary outline-none font-medium bg-white border-slate-200"
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
  );
};
