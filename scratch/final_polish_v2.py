import re

def final_polish_v2():
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    defined_vars = []
    brace_level = 0
    clean_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Track brace level
        # If the line starts the hook function
        if 'export function useProcurementHandlers' in line:
            brace_level += line.count('{') - line.count('}')
            clean_lines.append(line)
            continue
            
        # We are inside the hook body
        if brace_level == 1:
            # Check for top-level const or function
            # Use regex to find 'const name =' or 'function name(' at start of line with whitespace
            match = re.match(r'^\s*const\s+(\w+)\s*=', line)
            if match:
                defined_vars.append(match.group(1))
            
            # Skip any existing return statements at brace level 1
            if stripped.startswith('return {'):
                # But wait, we need to know where the return ends to skip it all
                # For now let's just not append it
                continue
            if stripped == '};' or stripped == '}':
                 # this might be the end of the return statement
                 # but we can't be sure without tracking braces
                 pass

        clean_lines.append(line)
        brace_level += line.count('{') - line.count('}')

    # Reconstruct
    content = "".join(clean_lines).strip()
    # Find the last closing brace
    if content.endswith('}'):
        content = content[:-1].strip()
    
    # Remove any stray 'return {' at the end
    last_ret = content.rfind('return {')
    if last_ret != -1 and last_ret > len(content) - 500: # only if it's near the end
        content = content[:last_ret].strip()

    defined_vars = sorted(list(set(defined_vars)))
    # Remove NegotiationForm if it's already there (it should be)
    
    new_return = "\n\n  return { %s };\n}" % (", ".join(defined_vars))
    
    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(content + new_return)
    print("Polished handlers v2. Exported %d vars." % len(defined_vars))

final_polish_v2()
