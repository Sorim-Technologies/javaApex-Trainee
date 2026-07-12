with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if '/migration/start' in line or 'start_migration' in line or '/migration' in line or 'run_tests' in line:
        print(f"Line {idx+1}: {line.strip()}")
