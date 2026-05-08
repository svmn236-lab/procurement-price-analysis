import re

def find_duplicates(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to find "const name =" or "function name("
    # Note: This is a bit naive but should find most duplicates in this hook
    declarations = re.findall(r'(?:const|let|var|function)\s+([a-zA-Z0-9_]+)', content)
    
    counts = {}
    for name in declarations:
        counts[name] = counts.get(name, 0) + 1
    
    duplicates = [name for name, count in counts.items() if count > 1]
    
    # Exclude common ones that might appear in inner scopes if we were being careful,
    # but here everything is in one hook scope.
    # Actually, many things like 'ai', 'model', 'prompt' might be duplicated in different functions.
    # We are looking for TOP-LEVEL (hook-level) duplicates.
    
    return duplicates

dups = find_duplicates('src/hooks/useProcurementHandlers.tsx')
print("Potential duplicates:", dups)
