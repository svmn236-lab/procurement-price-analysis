import re
import os

def final_split():
    # Read everything from handlers (which currently has most of the code)
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract the block after the destructuring
    # Handlers file has 3 destructuring blocks at the top now due to previous runs
    body = content.split('const { activeCostItem, chartData, stats } = calculations;\n\n')[1].rsplit('\n\n  return {', 1)[0]
    
    lines = body.split('\n')
    
    state_blocks = []
    calc_blocks = []
    handler_blocks = []
    
    current_block = []
    brace = 0
    paren = 0
    
    for line in lines:
        if brace == 0 and paren == 0 and not current_block:
            if line.strip() == '': continue
            current_block.append(line)
        else:
            current_block.append(line)
            
        brace += line.count('{') - line.count('}')
        paren += line.count('(') - line.count(')')
        
        if brace == 0 and paren == 0:
            block_str = '\n'.join(current_block)
            if 'useState(' in block_str or 'useRef(' in block_str:
                # Check if it's inside NegotiationForm or something else
                # Actually at top level they start with '  const '
                if block_str.strip().startswith('const ['):
                    state_blocks.append(block_str)
                elif 'useRef' in block_str and block_str.strip().startswith('const '):
                    state_blocks.append(block_str)
                else:
                    handler_blocks.append(block_str)
            elif 'useMemo(' in block_str:
                calc_blocks.append(block_str)
            elif block_str.strip().startswith('type ') or block_str.strip().startswith('interface '):
                calc_blocks.append(block_str)
            else:
                handler_blocks.append(block_str)
            current_block = []

    # Get state names for destructuring
    state_vars = set()
    for b in state_blocks:
        m = re.search(r'const\s+\[(.*?)\]\s*=', b)
        if m:
            for v in m.group(1).split(','): state_vars.add(v.strip())
        m = re.search(r'const\s+(\w+)\s*=\s*useRef', b)
        if m: state_vars.add(m.group(1))

    # Also add those from the existing useProcurementStates.ts
    with open('src/hooks/useProcurementStates.ts', 'r', encoding='utf-8') as f:
        old_states = f.read()
        m = re.findall(r'const\s+\[(.*?)\]\s*=', old_states)
        for group in m:
            for v in group.split(','): state_vars.add(v.strip())
        m = re.findall(r'const\s+(\w+)\s*=\s*useRef', old_states)
        for v in m: state_vars.add(v)
        
        # Also extract the blocks from old states
        old_body = old_states.split('export function useProcurementStates() {')[1].rsplit('return {', 1)[0]
        # Only keep the ones not already in state_blocks
        for b in old_body.split('\n\n'):
            if 'useState' in b or 'useRef' in b:
                if b.strip() not in [sb.strip() for sb in state_blocks]:
                    state_blocks.append(b)

    calc_vars = set()
    for b in calc_blocks:
        m = re.search(r'const\s+(\w+)\s*=\s*useMemo', b)
        if m: calc_vars.add(m.group(1))

    handler_vars = set()
    for b in handler_blocks:
        m = re.search(r'const\s+(\w+)\s*=', b)
        if m: handler_vars.add(m.group(1))

    imports = '''import React, { useState, useRef, useMemo, useCallback } from "react";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { 
  Vendor, CostItem, ConsolidatedSpec, CostHistoryEntry, 
  AlternativeProduct, RecommendedVendor, Phase2State, Phase2AlignedRow, 
  NegotiationRecord, SavedProject, HistoryExcelRow, Phase3State
} from "@/types/procurement";
import { INITIAL_VENDORS, GEMINI_PDF_VISION_MODEL, GEMINI_PHASE2_TEXT_MODEL, extractJsonArrayFromText } from "@/lib/constants";
'''

    sorted_states = sorted(list(state_vars))
    sorted_calcs = sorted(list(calc_vars))
    sorted_handlers = sorted(list(handler_vars))

    with open('src/hooks/useProcurementStates.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useProcurementStates() {\n" + '\n\n'.join(state_blocks) + "\n\n  return { " + ", ".join(sorted_states) + " };\n}\n")

    with open('src/hooks/useCostCalculations.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useCostCalculations(states: any) {\n  const { " + ", ".join(sorted_states) + " } = states;\n\n" + '\n\n'.join(calc_blocks) + "\n\n  return { " + ", ".join(sorted_calcs) + " };\n}\n")

    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(imports + "\nexport function useProcurementHandlers(states: any, calculations: any) {\n  const { " + ", ".join(sorted_states) + " } = states;\n  const { " + ", ".join(sorted_calcs) + " } = calculations;\n\n" + '\n\n'.join(handler_blocks) + "\n\n  return { " + ", ".join(sorted_handlers) + " };\n}\n")

    print("Final split completed.")

final_split()
