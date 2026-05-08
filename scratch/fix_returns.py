with open('src/hooks/useProcurementHandlers.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if 'saveNegotiationRecord, startEditing, toggleNegotiationForm, updateRowGrouping' in line and 'return {' in line:
        # This is our good return
        # Find the end of it
        pass
    
# Actually, let's just find the first return after line 1800 and keep it, then stop.
first_return_line = -1
for i, line in enumerate(lines):
    if i > 1800 and 'return {' in line:
        first_return_line = i
        break

if first_return_line != -1:
    # Keep lines up to the end of this return block
    final_lines = lines[:first_return_line]
    # Find where this return block ends
    for i in range(first_return_line, len(lines)):
        final_lines.append(lines[i])
        if lines[i].strip() == '};':
            final_lines.append('}\n')
            break
    
    with open('src/hooks/useProcurementHandlers.tsx', 'w', encoding='utf-8') as f:
        f.writelines(final_lines)
    print("Fixed duplicate returns.")
else:
    print("Could not find return block after line 1800.")
