with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'class MigrationResult' in line:
        print(f"Line {idx+1}: {line.strip()}")
        # print next 30 lines
        for j in range(1, 35):
            if idx + j < len(lines):
                print(f"  {idx+j+1}: {lines[idx+j].strip()}")
