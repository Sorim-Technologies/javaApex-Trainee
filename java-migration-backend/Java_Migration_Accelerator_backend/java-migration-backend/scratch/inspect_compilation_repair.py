with open('services/testing/compilation_repair.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'def _run_compilation' in line:
        print(f"Line {idx+1}: {line.strip()}")
        # print next 30 lines
        for j in range(idx+1, min(idx+40, len(lines))):
            print(f"  {lines[j].strip()}")
