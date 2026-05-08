"use client";
import React from "react";
import { Download, Upload, Camera, RefreshCw } from "lucide-react";

interface ProcurementHeaderProps {
  projectName: string;
  setProjectName: (name: string) => void;
  historyImportRef: React.RefObject<HTMLInputElement>;
  handleImportHistoryFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportHistoryAsExcel: () => void;
  handleScreenshot: () => void;
  handleClearAll: () => void;
  historyFeedback: string;
}

export const ProcurementHeader: React.FC<ProcurementHeaderProps> = ({
  projectName,
  setProjectName,
  historyImportRef,
  handleImportHistoryFile,
  exportHistoryAsExcel,
  handleScreenshot,
  handleClearAll,
  historyFeedback,
}) => {
  return (
    <>
      <header className="card-premium p-6 mb-8 border-l-8 border-brand-primary flex flex-col md:flex-row md:items-center justify-between gap-6 glass-effect">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">採購發包決策輔助系統</h1>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
            Scope: General Procurement (Excluding: 綜合企劃部, 財務部)
          </p>
          <div className="mt-4">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="輸入購案名稱"
              className="input-base w-full md:w-[400px] font-bold text-slate-800 text-lg shadow-inner"
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
          <button onClick={exportHistoryAsExcel} className="btn-success">
            <Download size={18} />
            <span className="hidden sm:inline">匯出 Excel</span>
          </button>
          <button onClick={() => historyImportRef.current?.click()} className="btn-violet">
            <Upload size={18} />
            <span className="hidden sm:inline">匯入 Excel</span>
          </button>
          <button onClick={handleScreenshot} className="btn-primary">
            <Camera size={18} />
            <span className="hidden sm:inline">頁面截圖</span>
          </button>
          <button onClick={handleClearAll} className="btn-ghost">
            <RefreshCw size={16} /> <span className="hidden sm:inline">清除所有</span>
          </button>
          <div className="badge-blue flex items-center gap-2 py-2 px-4 shadow-sm">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-xs font-black tracking-widest">AI REAL-TIME</span>
          </div>
        </div>
      </header>
      {historyFeedback && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 text-sm font-bold text-blue-700">
          {historyFeedback}
        </div>
      )}
    </>
  );
};
