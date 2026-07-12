with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'broadcast' in line or 'update_job' in line:
        if idx > 2000:
            print(f"Line {idx+1}: {line.strip()}")
