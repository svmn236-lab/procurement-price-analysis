import re
import os

def rebuild():
    # Read all 3 files
    content = ""
    with open('src/hooks/useProcurementStates.ts', 'r', encoding='utf-8') as f:
        content += f.read() + "\n"
    with open('src/hooks/useCostCalculations.ts', 'r', encoding='utf-8') as f:
        content += f.read() + "\n"
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        content += f.read() + "\n"

    # We will extract ALL lines that look like state, ref, memo, functions
    lines = content.split('\n')
    
    state_lines = []
    calc_lines = []
    handler_lines = []

    state_vars = set()
    calc_vars = set()
    handler_vars = set()

    # To avoid parsing issues, we will just use a simpler heuristic.
    # Every top-level declaration in the hooks is one of:
    # 1. const [x, setX] = useState...
    # 2. const x = useRef...
    # 3. const x = useMemo...
    # 4. const funcName = ... (arrow function)
    # 5. const NegotiationForm = ...
    # 6. type / interface
    
    # Let's extract blocks by looking at "const " or "type "
    blocks = []
    current_block = []
    brace = 0
    paren = 0
    
    for line in lines:
        if line.strip() == '' or line.startswith('import ') or line.startswith('export function ') or line.startswith('export const ') or line.startswith('  return {') or line.strip() == '}' or line.startswith('  const {') and '} = states' in line or line.startswith('  const {') and '} = calculations' in line or line.startswith('// ---') or line.startswith('/**'):
            # skip imports, exports, returns, destructurings
            if brace == 0 and paren == 0 and not current_block:
                continue
                
        # if we are not in a block, and line starts with '  const ' or '  type '
        if brace == 0 and paren == 0:
            if line.startswith('  const ') or line.startswith('  type ') or line.startswith('  //') or line.startswith('  /*'):
                if current_block:
                    blocks.append('\n'.join(current_block))
                current_block = [line]
            else:
                if current_block:
                    current_block.append(line)
        else:
            if current_block:
                current_block.append(line)
                
        brace += line.count('{') - line.count('}')
        paren += line.count('(') - line.count(')')

    if current_block:
        blocks.append('\n'.join(current_block))

    # Now classify blocks
    for b in blocks:
        if b.strip() == '': continue
        if 'useState(' in b or 'useRef(' in b:
            state_lines.append(b)
            m = re.search(r'const\s+\[(.*?)\]\s*=', b)
            if m:
                for v in m.group(1).split(','): state_vars.add(v.strip())
            m = re.search(r'const\s+(\w+)\s*=\s*useRef', b)
            if m: state_vars.add(m.group(1))
        elif 'useMemo(' in b:
            calc_lines.append(b)
            m = re.search(r'const\s+(\w+)\s*=\s*useMemo', b)
            if m: calc_vars.add(m.group(1))
        elif b.startswith('  type ') or b.startswith('  interface '):
            calc_lines.append(b)
        elif b.startswith('  //') or b.startswith('  /*'):
            pass # ignore stray comments
        elif 'const NegotiationForm' in b:
            handler_lines.append(b)
            handler_vars.add('NegotiationForm')
        else:
            handler_lines.append(b)
            m = re.search(r'const\s+(\w+)\s*=', b)
            if m: handler_vars.add(m.group(1))

    # Also hardcode strategy and activeTab just in case they were lost
    if 'strategy' not in state_vars:
        state_lines.append("  const [strategy, setStrategy] = useState<'cost-first' | 'quality-first'>('cost-first');")
        state_vars.update(['strategy', 'setStrategy'])
    if 'activeTab' not in state_vars:
        state_lines.append("  const [activeTab, setActiveTab] = useState<'phase1' | 'phase2' | 'phase3'>('phase1');")
        state_vars.update(['activeTab', 'setActiveTab'])

    imports = '''import React, { useState, useRef, useMemo, useCallback } from "react";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { 
  Vendor, CostItem, ConsolidatedSpec, CostHistoryEntry, 
  AlternativeProduct, RecommendedVendor, Phase2State, Phase2AlignedRow, 
  NegotiationRecord, SavedProject, HistoryExcelRow
} from "@/types/procurement";
import { INITIAL_VENDORS, GEMINI_PDF_VISION_MODEL, GEMINI_PHASE2_TEXT_MODEL, extractJsonArrayFromText } from "@/lib/constants";
'''

    with open('src/hooks/useProcurementStates.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useProcurementStates() {\n" + '\n\n'.join(state_lines) + "\n\n  return { " + ", ".join(sorted(list(state_vars))) + " };\n}\n")

    with open('src/hooks/useCostCalculations.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useCostCalculations(states: any) {\n  const { " + ", ".join(sorted(list(state_vars))) + " } = states;\n\n" + '\n\n'.join(calc_lines) + "\n\n  return { " + ", ".join(sorted(list(calc_vars))) + " };\n}\n")

    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useProcurementHandlers(states: any, calculations: any) {\n  const { " + ", ".join(sorted(list(state_vars))) + " } = states;\n  const { " + ", ".join(sorted(list(calc_vars))) + " } = calculations;\n\n" + '\n\n'.join(handler_lines) + "\n\n  return { " + ", ".join(sorted(list(handler_vars))) + " };\n}\n")

    print("Rebuild script completed. Found %d states, %d calcs, %d handlers." % (len(state_vars), len(calc_vars), len(handler_vars)))

rebuild()
