import os

path = r'c:\Users\520475\Desktop\Google antigravity\procurement-price-analysis\src\hooks\useProcurementHandlers.tsx'

with open(path, 'rb') as f:
    content = f.read()

# Try to decode with utf-8, replace errors with '?'
decoded = content.decode('utf-8', errors='replace')

# Manually fix some common corruptions if I can recognize them
# But it's better to just write it back and let the user know

with open(path, 'w', encoding='utf-8') as f:
    f.write(decoded)

print("File 'fixed' with replacements. Please check for '?' characters.")
