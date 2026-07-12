with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if idx > 2950 and idx < 2990:
        print(f"Line {idx+1}: {line.strip()}")
