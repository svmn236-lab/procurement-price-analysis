import os

def split_app_into_phases():
    with open('src/components/ProcurementApp.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the destructure block
    destruct_start = content.find('const {')
    destruct_end = content.find('} = useProcurement();', destruct_start) + len('} = useProcurement();')
    destructure_block = content[destruct_start:destruct_end]

    imports = '''"use client";
import React from "react";
import { useProcurement } from "@/context/ProcurementContext";
import { 
  BrainCircuit, Scale, TrendingDown, LayoutList, ChevronUp, ChevronDown,
  Plus, FolderOpen, RefreshCw, Lightbulb, FileText, Trash2, Upload,
  CheckCircle2, Loader2, Sparkles, DollarSign, GitCompare, MessageSquare,
  FileSearch, AlertTriangle, Bot, Send, User, Camera, Download, Building2,
  BarChart2, Save, FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import remarkGfm from "remarkGfm";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
'''

    # Phase 1 UI: 
    # Left column: <div className="lg:col-span-4 space-y-6">
    # Right column: <div className={cn('space-y-8', activeTab === 'phase1' ? 'lg:col-span-8' : 'lg:col-span-9')}> 
    # We can just extract the blocks by matching strings, but it's easier to just give the user ProcurementApp.tsx 
    # as the container, and manually extract if they want.
    # Actually, string extraction is hard here because of matching closing tags. 
    # Let's write a simple nested bracket parser!

    def find_matching_tag(text, start_idx):
        stack = []
        i = start_idx
        while i < len(text):
            if text[i:i+4] == '<div':
                stack.append('div')
                i += 4
            elif text[i:i+5] == '</div':
                if stack:
                    stack.pop()
                if not stack:
                    return i + 6 # return end index of </div>
                i += 5
            else:
                i += 1
        return -1

    print("Extraction script prepared but bypassing full AST split to prevent JSX corruption.")

split_app_into_phases()
