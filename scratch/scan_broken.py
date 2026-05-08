with open('src/hooks/useProcurementHandlers.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'JSON.parse(response.text' in line or 'await ai.models.generateContent' in line:
        print(f"Line {i+1}: {line.strip()}")
