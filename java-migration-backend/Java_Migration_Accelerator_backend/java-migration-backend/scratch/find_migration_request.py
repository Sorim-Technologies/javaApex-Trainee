with open('../../../src/components/MigrationWizard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'startMigration' in line or 'migrationRequest' in line or 'target_java_version' in line:
        print(f"Line {idx+1}: {line.strip()}")
