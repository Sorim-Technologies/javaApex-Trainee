from pathlib import Path
text = Path('src/components/MigrationWizard.tsx').read_text(encoding='utf8')
stack = []
state = 'normal'
line = 1
col = 0
for i, ch in enumerate(text):
    if ch == '\n':
        line += 1
        col = 0
        if state == 'line':
            state = 'normal'
        continue
    col += 1
    if state == 'normal':
        if ch == '"':
            state = 'double'
            continue
        if ch == "'":
            state = 'single'
            continue
        if ch == '`':
            state = 'template'
            continue
        if ch == '/' and i + 1 < len(text) and text[i + 1] == '/':
            state = 'line'
            continue
        if ch == '/' and i + 1 < len(text) and text[i + 1] == '*':
            state = 'block'
            continue
        if ch in '{[(':
            stack.append((ch, line, col))
            continue
        if ch in '}])':
            if not stack:
                print('extra close', ch, 'at', line, col)
                break
            op, ol, oc = stack[-1]
            if (op == '{' and ch == '}') or (op == '(' and ch == ')') or (op == '[' and ch == ']'):
                stack.pop()
                continue
            print('mismatch', op, 'from', ol, oc, 'with', ch, 'at', line, col)
            break
    elif state == 'double':
        if ch == '\\':
            state = 'double_escape'
            continue
        if ch == '"':
            state = 'normal'
            continue
    elif state == 'single':
        if ch == '\\':
            state = 'single_escape'
            continue
        if ch == "'":
            state = 'normal'
            continue
    elif state == 'template':
        if ch == '\\':
            state = 'template_escape'
            continue
        if ch == '`':
            state = 'normal'
            continue
    elif state == 'block':
        if ch == '*' and i + 1 < len(text) and text[i + 1] == '/':
            state = 'normal'
            continue
    elif state.endswith('_escape'):
        state = state.replace('_escape', '')
        continue
else:
    print('completed state', state)
    print('remaining stack', len(stack))
    if stack:
        print('top stack entries')
        for entry in stack[-20:]:
            print(entry)
