import re

def final_fix_handlers():
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    seen_vars = set()
    new_lines = []
    
    # We will identify the top-level const definitions and keep only the first occurrence
    # to remove the duplicates I just introduced.
    
    # Also we will find all top-level consts to build the return statement correctly.
    
    in_function = False
    brace_level = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Detect top-level const
        if line.startswith('  const ') and brace_level == 0:
            match = re.search(r'const (\w+) = ', line)
            if match:
                var_name = match.group(1)
                if var_name in seen_vars and var_name != 'NegotiationForm':
                    # Skip duplicate
                    # We need to skip the entire block
                    temp_brace = line.count('{') - line.count('}')
                    i += 1
                    while i < len(lines) and temp_brace > 0:
                        temp_brace += lines[i].count('{') - lines[i].count('}')
                        i += 1
                    continue
                seen_vars.add(var_name)
        
        if line.strip().startswith('return {'):
            # Skip old return
            i += 1
            continue
            
        if line.strip() == '}':
            # Closing brace of the hook
            pass

        new_lines.append(line)
        brace_level += line.count('{') - line.count('}')
        i += 1

    # Reconstruct content
    content = "".join(new_lines).strip()
    if content.endswith('}'):
        content = content[:-1].strip()
    
    # Build correct return
    return_vars = sorted(list(seen_vars))
    # Make sure common ones are included
    # (seen_vars should already have them)
    
    new_return = "\n\n  return { %s };\n}\n" % (", ".join(return_vars))
    
    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(content + new_return)
    print("Final fix for handlers return. Exported: %s" % (", ".join(return_vars)))

final_fix_handlers()
