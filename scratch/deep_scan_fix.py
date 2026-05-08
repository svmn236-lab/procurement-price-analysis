import os

def scan_and_fix():
    target = 'useProcurementHandlers.ts'
    root_dir = '.'
    fixed_files = []

    for root, dirs, files in os.walk(root_dir):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.next' in dirs:
            dirs.remove('.next')
        if '.git' in dirs:
            dirs.remove('.git')
            
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if target in content:
                        new_content = content.replace(target, 'useProcurementHandlers')
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        fixed_files.append(path)
                except Exception as e:
                    pass
    
    if fixed_files:
        print("Fixed imports in:")
        for f in fixed_files:
            print(f"- {f}")
    else:
        print("No explicit .ts imports found in source files.")

scan_and_fix()
