with open('../../../src/components/MigrationWizard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'getJavaVersions' in line or 'targetJavaVersion' in line or 'target_java_version' in line or 'javaVersions' in line or 'targetJavaVersions' in line:
        print(f"Line {idx+1}: {line.strip()}")
