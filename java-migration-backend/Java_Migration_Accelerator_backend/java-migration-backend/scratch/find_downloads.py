with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if '/report' in line or 'download' in line or 'jacoco' in line or 'xml' in line:
        if idx > 1200:
            print(f"Line {idx+1}: {line.strip()}")
