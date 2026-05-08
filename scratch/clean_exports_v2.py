import re

def clean_handlers_return():
    with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    defined_vars = []
    # Find variables defined at exactly 2 spaces indentation
    for line in lines:
        if line.startswith('  const '):
            # Extract variable name
            match = re.search(r'const (\w+) = ', line)
            if match:
                defined_vars.append(match.group(1))
    
    defined_vars = sorted(list(set(defined_vars)))
    
    # We want to keep everything in the file up to the return statement
    # But wait, there might be multiple returns now.
    
    new_lines = []
    for line in lines:
        if line.strip().startswith('return {') and 'NegotiationForm' in line:
            continue # skip the giant return lines
        if line.strip() == '}':
            # This might be the end of the hook
            pass
        new_lines.append(line)
    
    # Let's find the last line that belongs to the hook (before the final closing brace)
    # Actually, I'll just rewrite the whole file structure.
    
    content = "".join(lines)
    # Find the last closing brace of the export function
    # It should be the very last character or followed by newline
    content = content.strip()
    if content.endswith('}'):
        content = content[:-1].strip() # remove the final }
    
    # Now remove any existing return statements at the end
    # Find the last 'return {'
    last_return_idx = content.rfind('return {')
    if last_return_idx != -1:
        # Check if it's the giant return
        content = content[:last_return_idx].strip()

    new_return = "\n\n  return { %s };\n}\n" % (", ".join(defined_vars))
    final_content = content + new_return
    
    with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
        f.write(final_content)
    print("Correctly cleaned useProcurementHandlers.ts return. Found %d top-level vars." % len(defined_vars))

clean_handlers_return()
