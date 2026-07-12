with open('../../../src/components/MigrationWizard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'renderStep11' in line or 'currentStep' in line or 'step' in line:
        if 'case 11' in line or 'step === 11' in line or 'activeStep' in line:
            print(f"Line {idx+1}: {line.strip()}")
