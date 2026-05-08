import re

def final_fix_handlers_v2():
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    seen_vars = set()
    new_lines = []
    
    brace_level = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Opening brace of the hook function
        if 'export function useProcurementHandlers' in line:
            brace_level += line.count('{') - line.count('}')
            new_lines.append(line)
            i += 1
            continue

        # Detect top-level const inside the hook (brace_level == 1)
        if line.startswith('  const ') and brace_level == 1:
            match = re.search(r'const (\w+) = ', line)
            if match:
                var_name = match.group(1)
                if var_name in seen_vars and var_name != 'NegotiationForm':
                    # Skip duplicate
                    temp_brace = line.count('{') - line.count('}')
                    i += 1
                    while i < len(lines) and temp_brace > 0:
                        temp_brace += lines[i].count('{') - lines[i].count('}')
                        i += 1
                    continue
                seen_vars.add(var_name)
        
        if line.strip().startswith('return {') and brace_level == 1:
            # Skip old return
            i += 1
            continue
            
        new_lines.append(line)
        brace_level += line.count('{') - line.count('}')
        i += 1

    # Reconstruct content
    content = "".join(new_lines).strip()
    # If there are multiple closing braces, make sure we only have one at the very end
    # Actually, brace_level should be 0 at the end.
    
    if not content.endswith('}'):
        content += '\n}'

    # Build correct return
    # Filter out variables that aren't actually functions or components if needed,
    # but for now let's export everything we found.
    return_vars = sorted(list(seen_vars))
    
    # We need to insert the return before the last }
    content = content.rsplit('}', 1)[0]
    
    new_return = "\n  return { %s };\n}" % (", ".join(return_vars))
    
    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(content + new_return)
    print("Final fix for handlers return. Exported %d vars." % len(return_vars))

final_fix_handlers_v2()
