with open('src/hooks/useProcurementHandlers.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
found_new_return = False
for line in lines:
    new_lines.append(line)
    if 'return {' in line and 'NegotiationForm' in line and 'aggregatePhase3Data' in line:
        found_new_return = True
    if found_new_return and line.strip() == '};':
        # Found the end of our good return
        new_lines.append('}\n')
        break

with open('src/hooks/useProcurementHandlers.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Truncated useProcurementHandlers.ts correctly.")
