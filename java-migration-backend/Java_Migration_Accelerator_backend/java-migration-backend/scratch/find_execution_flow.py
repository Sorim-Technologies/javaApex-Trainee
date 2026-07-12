with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'execute_tests' in line or 'generate_and_parse_report' in line or 'coverage_line' in line:
        if idx > 2700 and idx < 3050:
            print(f"Line {idx+1}: {line.strip()}")
