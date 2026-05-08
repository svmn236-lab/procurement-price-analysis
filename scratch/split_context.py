import os
import re

def split_hooks():
    with open('src/context/ProcurementContext.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of the provider
    provider_start = content.find('export const ProcurementProvider:')
    provider_body_start = content.find('{', provider_start) + 1

    context_value_start = content.find('const contextValue = {', provider_body_start)
    context_value_end = content.find('};', context_value_start) + 2

    # Extract the block
    body = content[provider_body_start:context_value_start]

    # Find states and refs
    states = []
    calculations = []
    handlers = []

    # Simple block parsing using brace matching
    def parse_blocks(text):
        blocks = []
        i = 0
        while i < len(text):
            if text.startswith('  const [', i) or text.startswith('  const activeCostItem', i) or text.startswith('  const stats', i) or text.startswith('  const chartData', i) or text.startswith('  const ', i) or text.startswith('  type ', i) or text.startswith('  //', i) or text.startswith('  /**', i):
                # We need to extract until the next newline or matching brace if it's a block
                start = i
                
                # Check if it's a comment
                if text.startswith('  //', i):
                    end = text.find('\n', i)
                    if end == -1: end = len(text)
                    blocks.append({'type': 'comment', 'content': text[start:end+1]})
                    i = end + 1
                    continue
                if text.startswith('  /**', i):
                    end = text.find('*/\n', i)
                    if end == -1: end = len(text)
                    else: end += 3
                    blocks.append({'type': 'comment', 'content': text[start:end]})
                    i = end
                    continue

                if text.startswith('  type ', i):
                    end = text.find('\n', i)
                    blocks.append({'type': 'type', 'content': text[start:end+1]})
                    i = end + 1
                    continue

                # It's a const or let
                # Let's find if it contains an arrow function or block
                # find the first semicolon or the end of the matching braces
                brace_count = 0
                paren_count = 0
                j = i
                while j < len(text):
                    if text[j] == '{': brace_count += 1
                    elif text[j] == '}': brace_count -= 1
                    elif text[j] == '(': paren_count += 1
                    elif text[j] == ')': paren_count -= 1
                    
                    if text[j] == ';' and brace_count == 0 and paren_count == 0:
                        end = j + 1
                        break
                    j += 1
                else:
                    end = len(text)

                content_block = text[start:end+1] # +1 to include \n maybe
                # determine type
                if 'useState(' in content_block or 'useRef(' in content_block:
                    blocks.append({'type': 'state', 'content': content_block})
                elif 'useMemo(' in content_block:
                    blocks.append({'type': 'calculation', 'content': content_block})
                else:
                    blocks.append({'type': 'handler', 'content': content_block})
                
                i = end
            else:
                i += 1
        return blocks

    blocks = parse_blocks(body)

    state_code = ""
    calc_code = ""
    handler_code = ""

    state_exports = []
    calc_exports = []
    handler_exports = []

    for b in blocks:
        if b['type'] == 'state':
            state_code += b['content'] + "\n"
            # Extract names
            m = re.search(r'const\s+\[(.*?)\]\s*=', b['content'])
            if m:
                vars = [v.strip() for v in m.group(1).split(',')]
                state_exports.extend(vars)
            m = re.search(r'const\s+(\w+)\s*=\s*useRef', b['content'])
            if m:
                state_exports.append(m.group(1))
        elif b['type'] == 'calculation':
            calc_code += b['content'] + "\n"
            m = re.search(r'const\s+(\w+)\s*=\s*useMemo', b['content'])
            if m:
                calc_exports.append(m.group(1))
        elif b['type'] == 'handler':
            handler_code += b['content'] + "\n"
            m = re.search(r'const\s+(\w+)\s*=', b['content'])
            if m:
                handler_exports.append(m.group(1))
        elif b['type'] == 'comment':
            # Add comments to all logic where appropriate, or just to state
            state_code += b['content']
            handler_code += b['content']
            calc_code += b['content']
        elif b['type'] == 'type':
            calc_code += b['content'] + "\n"

    # Clean up empty lines
    state_code = re.sub(r'\n\s*\n', '\n', state_code)
    
    # Generate files
    imports = '''import { useState, useRef, useMemo, useCallback } from "react";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { 
  Vendor, CostItem, ConsolidatedSpec, CostHistoryEntry, 
  AlternativeProduct, RecommendedVendor, Phase2State, Phase2AlignedRow, 
  NegotiationRecord, SavedProject, HistoryExcelRow
} from "@/types/procurement";
import { INITIAL_VENDORS } from "@/lib/constants";
'''

    os.makedirs('src/hooks', exist_ok=True)

    with open('src/hooks/useProcurementStates.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useProcurementStates() {\n" + state_code + "\n  return { " + ", ".join(state_exports) + " };\n}\n")

    with open('src/hooks/useCostCalculations.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useCostCalculations(states: any) {\n  const { " + ", ".join(state_exports) + " } = states;\n" + calc_code + "\n  return { " + ", ".join(calc_exports) + " };\n}\n")

    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useProcurementHandlers(states: any, calculations: any) {\n  const { " + ", ".join(state_exports) + " } = states;\n  const { " + ", ".join(calc_exports) + " } = calculations;\n" + handler_code + "\n  return { " + ", ".join(handler_exports) + " };\n}\n")

    # Rewrite ProcurementContext.tsx
    new_context = '''"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { useProcurementStates } from "@/hooks/useProcurementStates";
import { useCostCalculations } from "@/hooks/useCostCalculations";
import { useProcurementHandlers } from "@/hooks/useProcurementHandlers";

export interface ProcurementContextProps {
  [key: string]: any;
}

export const ProcurementContext = createContext<ProcurementContextProps | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const states = useProcurementStates();
  const calculations = useCostCalculations(states);
  const handlers = useProcurementHandlers(states, calculations);

  const contextValue = {
    ...states,
    ...calculations,
    ...handlers
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
    with open('src/context/ProcurementContext.tsx', 'w', encoding='utf-8') as f:
        f.write(new_context)

    print("Successfully split ProcurementContext.tsx into hooks.")

split_hooks()
