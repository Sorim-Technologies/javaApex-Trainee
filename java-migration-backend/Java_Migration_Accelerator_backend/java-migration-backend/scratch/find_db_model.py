import os

def find_definition(filename):
    if not os.path.exists(filename):
        return
    print(f"=== {filename} ===")
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for idx, line in enumerate(lines):
        if 'class ' in line or 'tests_' in line or 'coverage_' in line:
            print(f"Line {idx+1}: {line.strip()}")

find_definition('models.py')
find_definition('schemas.py')
