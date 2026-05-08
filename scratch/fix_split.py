import re

def fix_files():
    # 1. Read the three files
    with open('src/hooks/useProcurementStates.ts', 'r', encoding='utf-8') as f:
        states_content = f.read()
    with open('src/hooks/useCostCalculations.ts', 'r', encoding='utf-8') as f:
        calcs_content = f.read()
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        handlers_content = f.read()

    # We want to extract ALL `const [xyz, setXyz] = useState` and `const xyz = useRef`
    # from ANY file, and put them into useProcurementStates.ts
    
    # Let's just combine the bodies of all three to reconstruct the original body
    
    body1 = states_content.split('export function useProcurementStates() {')[1].rsplit('return {', 1)[0]
    body2 = calcs_content.split('const {')[1].split('} = states;')[1].rsplit('return {', 1)[0]
    
    handler_body_parts = handlers_content.split('} = calculations;\n')
    if len(handler_body_parts) > 1:
        body3 = handler_body_parts[1].rsplit('return {', 1)[0]
    else:
        body3 = ""

    full_body = body1 + "\n" + body2 + "\n" + body3

    # Now we will do a BETTER regex based splitting
    lines = full_body.split('\n')
    
    state_lines = []
    calc_lines = []
    handler_lines = []
    
    state_exports = set()
    calc_exports = set()
    handler_exports = set()
    
    current_block = []
    current_type = None
    
    # We will iterate line by line. If a line starts with "  const [" or "  const appRef =", it's state.
    # If it starts with "  const stats = useMemo" it's calc.
    # For multi-line blocks, we count braces.
    
    brace_count = 0
    paren_count = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Determine start of a block if we are not in one
        if brace_count == 0 and paren_count == 0 and line.strip():
            if 'useState(' in line or 'useRef(' in line:
                current_type = 'state'
            elif 'useMemo(' in line:
                current_type = 'calc'
            elif line.strip().startswith('//') or line.strip().startswith('/**') or line.strip() == '':
                current_type = 'comment'
            elif line.strip().startswith('type ') or line.strip().startswith('interface '):
                current_type = 'type'
            else:
                current_type = 'handler'
                
        current_block.append(line)
        
        # Update brace counts
        brace_count += line.count('{') - line.count('}')
        paren_count += line.count('(') - line.count(')')
        
        if brace_count == 0 and paren_count == 0:
            # Block ended
            block_str = '\n'.join(current_block)
            
            if current_type == 'state':
                state_lines.append(block_str)
                # extract names
                m = re.search(r'const\s+\[(.*?)\]\s*=', block_str)
                if m:
                    for v in m.group(1).split(','):
                        state_exports.add(v.strip())
                m = re.search(r'const\s+(\w+)\s*=\s*useRef', block_str)
                if m:
                    state_exports.add(m.group(1))
            elif current_type == 'calc':
                calc_lines.append(block_str)
                m = re.search(r'const\s+(\w+)\s*=\s*useMemo', block_str)
                if m:
                    calc_exports.add(m.group(1))
            elif current_type == 'type':
                calc_lines.append(block_str)
            elif current_type == 'handler':
                handler_lines.append(block_str)
                m = re.search(r'const\s+(\w+)\s*=', block_str)
                if m:
                    handler_exports.add(m.group(1))
            else:
                # comment
                if '優化點 2' in block_str or 'ChartRow' in block_str:
                    calc_lines.append(block_str)
                elif '優化點 3' in block_str or '步驟' in block_str or 'API' in block_str:
                    handler_lines.append(block_str)
                else:
                    state_lines.append(block_str)

            current_block = []
            current_type = None

        i += 1

    # In case there's leftover
    if current_block:
        handler_lines.append('\n'.join(current_block))

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

    # Ensure some known exports are definitely in the sets
    # because they might be missed by regex
    for name in ['activeCostItem', 'stats', 'chartData']:
        if name in handler_exports: handler_exports.remove(name)
        calc_exports.add(name)
        
    for name in ['NegotiationForm']:
        if name in state_exports: state_exports.remove(name)
        handler_exports.add(name)

    state_exp_str = ", ".join(sorted(list(state_exports)))
    calc_exp_str = ", ".join(sorted(list(calc_exports)))
    handler_exp_str = ", ".join(sorted(list(handler_exports)))

    with open('src/hooks/useProcurementStates.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useProcurementStates() {\n" + '\n'.join(state_lines) + "\n  return { " + state_exp_str + " };\n}\n")

    with open('src/hooks/useCostCalculations.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useCostCalculations(states: any) {\n  const { " + state_exp_str + " } = states;\n" + '\n'.join(calc_lines) + "\n  return { " + calc_exp_str + " };\n}\n")

    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useProcurementHandlers(states: any, calculations: any) {\n  const { " + state_exp_str + " } = states;\n  const { " + calc_exp_str + " } = calculations;\n" + '\n'.join(handler_lines) + "\n  return { " + handler_exp_str + " };\n}\n")

    print("Fix script completed.")

fix_files()
