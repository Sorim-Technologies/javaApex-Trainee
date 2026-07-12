with open('services/testing/test_generator.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'def ' in line or 'write' in line or 'save' in line or 'test' in line or 'path' in line:
        if idx > 150 and idx < 280:
            print(f"Line {idx+1}: {line.strip()}")
