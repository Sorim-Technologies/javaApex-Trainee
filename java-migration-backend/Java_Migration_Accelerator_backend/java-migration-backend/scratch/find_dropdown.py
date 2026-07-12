with open('../../../src/components/MigrationWizard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if '<select' in line or 'Target Java Version' in line or 'targetVersion' in line or 'target_java_version' in line:
        if idx > 1900 and idx < 3000:
            print(f"Line {idx+1}: {line.strip()}")
