import re

def final_polish():
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 1. Identify top-level variables (indentation 0 or 2, and brace level 1)
    # Actually, inside the function export function useProcurementHandlers(...) {
    # top-level is brace_level 1.
    
    defined_vars = []
    brace_level = 0
    
    clean_lines = []
    
    for line in lines:
        if 'export function useProcurementHandlers' in line:
            brace_level += line.count('{') - line.count('}')
            clean_lines.append(line)
            continue
            
        if brace_level == 1:
            # Check for top-level const
            # indentation should be 2 spaces
            if line.startswith('  const '):
                match = re.search(r'const (\w+) = ', line)
                if match:
                    defined_vars.append(match.group(1))
            
            # Skip any return statements
            if line.strip().startswith('return {'):
                continue
        
        # Keep everything else
        clean_lines.append(line)
        brace_level += line.count('{') - line.count('}')

    # Remove the final } from clean_lines if it exists, to insert our return
    content = "".join(clean_lines).strip()
    if content.endswith('}'):
        content = content[:-1].strip()
    
    # Filter defined_vars to only keep those we actually want to export
    # (Basically everything we found at top level)
    defined_vars = sorted(list(set(defined_vars)))
    
    new_return = "\n\n  return { %s };\n}" % (", ".join(defined_vars))
    
    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(content + new_return)
    print("Polished handlers. Exported: %s" % (", ".join(defined_vars)))

final_polish()
