import re
import os
import json

def extract_state_and_funcs():
    with open('src/components/ProcurementCostAnalysis.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of the component state
    start_str = 'const ProcurementCostAnalysis = () => {'
    start_idx = content.find(start_str)
    if start_idx == -1:
        start_str = 'export default function ProcurementCostAnalysis() {'
        start_idx = content.find(start_str)
        
    end_idx = content.find('// Initial setup visual delay if needed', start_idx)

    state_and_funcs = content[start_idx + len(start_str):end_idx]

    # Replace GoogleGenAI calls with Server Actions comments so they don't break compilation if missing imports
    # Actually, we should just leave them as they are and let the user/us fix the imports if needed.
    # To avoid breaking the AST too much, we just use the raw state block.
    
    # Extract variables and functions to export
    # We look for const [var, setVar] = useState...
    # and const funcName = ...
    # and let varName = ...
    # to export them.
    
    export_names = []
    
    # Find useState arrays
    for match in re.finditer(r'const\s+\[(.*?)\]\s*=', state_and_funcs):
        vars_str = match.group(1)
        for v in vars_str.split(','):
            v = v.strip()
            if v:
                export_names.append(v)
                
    # Find normal const functions/variables
    for match in re.finditer(r'const\s+([a-zA-Z0-9_]+)\s*=', state_and_funcs):
        export_names.append(match.group(1))

    # Find let variables
    for match in re.finditer(r'let\s+([a-zA-Z0-9_]+)\s*=', state_and_funcs):
        export_names.append(match.group(1))
        
    # We also have refs like appRef, historyImportRef
    
    export_names = list(set(export_names))
    
    # Clean up standard words we might have caught accidentally inside string templates or functions
    valid_names = []
    for n in export_names:
        if n and not n in ['isPdf', 'model', 'fileContext', 'specsContext', 'ai', 'response', 'data', 'prompt', 'newTotal', 'result', 'needsGenerate']:
            valid_names.append(n)

    context_code = '''"use client";
import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from "react";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { 
  Vendor, CostItem, ConsolidatedSpec, CostHistoryEntry, 
  AlternativeProduct, RecommendedVendor, Phase2State, Phase2AlignedRow, 
  NegotiationRecord, SavedProject 
} from "@/types/procurement";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

// Temporary placeholder for server actions
const GEMINI_PDF_VISION_MODEL = "gemini-3-flash-preview";
const GEMINI_PHASE2_TEXT_MODEL = "gemini-3-flash-preview";
const extractJsonArrayFromText = (t: any) => JSON.parse(t);

export interface ProcurementContextProps {
  [key: string]: any;
}

export const ProcurementContext = createContext<ProcurementContextProps | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
'''

    context_code += state_and_funcs

    context_code += '''
  const contextValue = {
'''
    
    context_code += ',\n    '.join(valid_names)
    
    context_code += '''
  };

  return (
    <ProcurementContext.Provider value={contextValue}>
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = () => {
  const context = useContext(ProcurementContext);
  if (!context) throw new Error("useProcurement must be used within a ProcurementProvider");
  return context;
};
'''
    os.makedirs('src/context', exist_ok=True)
    with open('src/context/ProcurementContext.tsx', 'w', encoding='utf-8') as f:
        f.write(context_code)
    
    print(f"Context generated successfully. Exported {len(valid_names)} variables/functions.")

    # Now let's extract the JSX parts
    jsx_start = content.find('return (', end_idx)
    jsx_block = content[jsx_start:]
    
    os.makedirs('scratch', exist_ok=True)
    with open('scratch/jsx_dump.txt', 'w', encoding='utf-8') as f:
        f.write(jsx_block)

extract_state_and_funcs()
