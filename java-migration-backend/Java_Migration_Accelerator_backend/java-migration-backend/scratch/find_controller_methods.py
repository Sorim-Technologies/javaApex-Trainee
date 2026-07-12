with open('/Users/ST-Sahana/AppData/Local/Temp/migrations/a179f3fe-8bc1-4879-8f6e-456c5ab48134/src/main/java/com/example/project/controller/AttendanceController.java', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'sendAttendanceEmailHtml' in line or 'sendWeeklyAttendanceEmailHtml' in line or 'previewWeeklyHtml' in line or 'getHistory' in line:
        print(f"Line {idx+1}: {line.strip()}")
        # print next 2 lines
        for j in range(idx+1, min(idx+3, len(lines))):
            print(f"  {lines[j].strip()}")
