with open('../../../src/components/MigrationWizard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'availableTargetVersions = useMemo' in line:
        print(f"Line {idx+1}: {line.strip()}")
