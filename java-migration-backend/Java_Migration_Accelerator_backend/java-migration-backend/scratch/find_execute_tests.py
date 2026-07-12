with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'execute_tests' in line and '=' in line and 'await' in line:
        print(f"Line {idx+1}: {line.strip()}")
        # print next 10 lines
        for j in range(idx+1, min(idx+15, len(lines))):
            print(f"  {lines[j].strip()}")
