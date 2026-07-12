with open('../../../src/components/MigrationWizard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'javaVersionFromBuild' in line or 'java_version_from_build' in line:
        print(f"Line {idx+1}: {line.strip()}")
