with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if line.strip().startswith('def ') or line.strip().startswith('async def '):
        if idx > 1000 and idx < 1200:
            print(f"Line {idx+1}: {line.strip()}")
