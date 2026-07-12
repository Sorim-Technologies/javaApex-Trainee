with open('services/migration_service.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if idx >= 54 and idx < 110:
        print(f"Line {idx+1}: {line.strip()}")
