import re

def clean_app_destructuring():
    with open('src/components/ProcurementApp.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the destructuring line
    match = re.search(r'const \{ (.*?) \} = useProcurement\(\);', content)
    if not match:
        print("Could not find destructuring")
        return
    
    vars_str = match.group(1)
    all_vars = [v.strip() for v in vars_str.split(',')]
    
    # Remove the destructuring line from content to check usage of vars elsewhere
    body_without_destructuring = content.replace(match.group(0), '')
    
    used_vars = []
    for v in all_vars:
        # Check if v is used as a variable (not inside a string or property name unless it's {v})
        # Simple heuristic: look for v surrounded by non-word chars
        if re.search(r'\b' + re.escape(v) + r'\b', body_without_destructuring):
            used_vars.append(v)
    
    new_vars_str = ", ".join(sorted(used_vars))
    new_content = content.replace(vars_str, new_vars_str)
    
    with open('src/components/ProcurementApp.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Cleaned ProcurementApp.tsx destructuring. Kept %d/%d vars." % (len(used_vars), len(all_vars)))
    return used_vars

used_vars = clean_app_destructuring()

# Now clean up useProcurementHandlers return statement based on what's defined in it
def clean_handlers_return(used_in_app):
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find what's actually defined at top level
    # Functions: const handleX = ...
    # Components: const NegotiationForm = ...
    
    # Let's just find everything after the destructuring and before the return
    body = content.split('} = calculations;\n\n')[1].rsplit('return {', 1)[0]
    
    defined_vars = re.findall(r'const (\w+) = ', body)
    # Filter to only keep what is used in app OR is a handler we definitely want
    # Actually, we want to export everything defined in this hook.
    
    # Remove duplicates
    defined_vars = sorted(list(set(defined_vars)))
    
    # Fix the return statement
    # Remove the double return
    parts = content.rsplit('\n\n  return {', 1)
    if len(parts) < 2:
        # try the other return
        parts = content.rsplit('  return {', 1)

    new_return = "\n  return { %s };\n}\n" % (", ".join(defined_vars))
    new_content = parts[0] + new_return
    
    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Cleaned useProcurementHandlers.ts return.")

clean_handlers_return(used_vars)
