"use client";
import React from "react";
import { BrainCircuit, Scale, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcurementTabsProps {
  activeTab: 'phase1' | 'phase2' | 'phase3';
  setActiveTab: (tab: 'phase1' | 'phase2' | 'phase3') => void;
}

export const ProcurementTabs: React.FC<ProcurementTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="nav-tabs-container">
      <button
        onClick={() => setActiveTab('phase1')}
        className={cn(
          'nav-tab',
          activeTab === 'phase1' ? 'text-blue-700 bg-blue-50/50 border-b-4 border-blue-600' : ''
        )}
      >
        <BrainCircuit size={20} />
        第一階段：AI 成本模擬
      </button>
      <div className="w-px h-8 bg-slate-200" />
      <button
        onClick={() => setActiveTab('phase2')}
        className={cn(
          'nav-tab',
          activeTab === 'phase2' ? 'text-violet-700 bg-violet-50/50 border-b-4 border-violet-600' : ''
        )}
      >
        <Scale size={20} />
        第二階段：廠商報價比對
      </button>
      <div className="w-px h-8 bg-slate-200" />
      <button
        onClick={() => setActiveTab('phase3')}
        className={cn(
          'nav-tab',
          activeTab === 'phase3' ? 'text-emerald-700 bg-emerald-50/50 border-b-4 border-emerald-600' : ''
        )}
      >
        <TrendingDown size={20} />
        第三階段：主管決策報表
      </button>
    </div>
  );
};
