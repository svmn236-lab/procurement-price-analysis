import re

def final_fix_handlers_v3():
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of the function body
    start_match = re.search(r'export function useProcurementHandlers\(.*?\)\s*\{', content)
    if not start_match:
        print("Could not find function start")
        return
    
    header = content[:start_match.end()]
    body = content[start_match.end():].rsplit('return {', 1)[0].strip()
    if body.endswith('}'): # if it was already cleaned
        body = body[:-1].strip()

    # Split body into blocks based on top-level const/function
    # We will use a regex that finds lines starting with optional whitespace then 'const'
    lines = body.split('\n')
    
    seen_vars = set()
    new_body_parts = []
    brace_level = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # We only care about const definitions that are NOT inside other functions
        # Heuristic: indentation is small (0, 2, or 4 spaces) and brace_level is 0
        stripped = line.lstrip()
        if stripped.startswith('const ') and brace_level == 0:
            match = re.search(r'const (\w+) = ', stripped)
            if match:
                var_name = match.group(1)
                if var_name in seen_vars and var_name != 'NegotiationForm':
                    # Skip duplicate block
                    temp_brace = line.count('{') - line.count('}')
                    i += 1
                    while i < len(lines) and (temp_brace > 0 or (brace_level == 0 and not lines[i].strip())):
                        if i >= len(lines): break
                        temp_brace += lines[i].count('{') - lines[i].count('}')
                        i += 1
                    continue
                seen_vars.add(var_name)
        
        new_body_parts.append(line)
        brace_level += line.count('{') - line.count('}')
        i += 1

    final_body = "\n".join(new_body_parts).strip()
    return_vars = sorted(list(seen_vars))
    
    new_return = "\n\n  return { %s };\n}" % (", ".join(return_vars))
    
    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(header + "\n" + final_body + new_return)
    print("Final fix for handlers return. Exported %d vars." % len(return_vars))

final_fix_handlers_v3()
