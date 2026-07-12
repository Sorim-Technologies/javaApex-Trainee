with open('services/migration_service.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'def save_migration' in line or 'def create_migration' in line:
        print(f"Line {idx+1}: {line.strip()}")
        # print next 20 lines
        for j in range(idx+1, min(idx+35, len(lines))):
            print(f"  {lines[j].strip()}")
