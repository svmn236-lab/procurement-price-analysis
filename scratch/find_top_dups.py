import re

def find_top_level_duplicates(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # We want to find declarations that are NOT indented too much (hook level)
    # The hook starts at line 13: export function useProcurementHandlers(states: any, calculations: any) {
    # So hook-level declarations start with 2 spaces.
    
    declarations = []
    for i, line in enumerate(lines):
        # Look for "  const name =" or "  function name("
        match = re.match(r'^  (?:const|let|var|function)\s+([a-zA-Z0-9_]+)', line)
        if match:
            declarations.append((match.group(1), i + 1))
            
    counts = {}
    for name, line_num in declarations:
        if name not in counts:
            counts[name] = []
        counts[name].append(line_num)
        
    duplicates = {name: lines_nums for name, lines_nums in counts.items() if len(lines_nums) > 1}
    return duplicates

dups = find_top_level_duplicates('src/hooks/useProcurementHandlers.tsx')
for name, lines in dups.items():
    print(f"Duplicate {name} at lines: {lines}")
