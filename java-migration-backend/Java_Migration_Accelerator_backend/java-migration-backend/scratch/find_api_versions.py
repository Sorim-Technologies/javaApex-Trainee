with open('../../../src/services/api.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'getJavaVersions' in line:
        print(f"Line {idx+1}: {line.strip()}")
