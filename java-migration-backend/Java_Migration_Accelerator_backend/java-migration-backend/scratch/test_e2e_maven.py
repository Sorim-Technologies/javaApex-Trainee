"""
Simulates exactly what test_execution_service does: patch pom.xml, run mvn, restore.
"""
import os, re, subprocess, sys

project_path = r"C:\Users\ST-Sahana\AppData\Local\Temp\migrations\7c0f3650-4284-4c8e-be13-cc39afd4b922"
pom_path = os.path.join(project_path, "pom.xml")

# Read original
with open(pom_path, "r", encoding="utf-8") as f:
    original_content = f.read()

# Patch
sys_version = 21
content = original_content
patterns = [
    (r"<java\.version>(\d+)</java\.version>", r"<java.version>{sys_ver}</java.version>"),
    (r"<maven\.compiler\.source>(\d+)</maven\.compiler\.source>", r"<maven.compiler.source>{sys_ver}</maven.compiler.source>"),
    (r"<maven\.compiler\.target>(\d+)</maven\.compiler\.target>", r"<maven.compiler.target>{sys_ver}</maven.compiler.target>"),
    (r"<release>(\d+)</release>", r"<release>{sys_ver}</release>"),
]

modified = False
for pat, repl in patterns:
    m = re.search(pat, content)
    if m:
        proj_ver = int(m.group(1))
        if proj_ver > sys_version:
            content = re.sub(pat, repl.format(sys_ver=sys_version), content)
            modified = True

if modified:
    print(f"Patched pom.xml Java version to {sys_version}")
    with open(pom_path, "w", encoding="utf-8") as f:
        f.write(content)

# Run mvn
try:
    cmd = "mvn clean test -Dmaven.test.failure.ignore=true -q"
    print(f"Running: {cmd}")
    result = subprocess.run(
        cmd,
        cwd=project_path,
        shell=True,
        capture_output=True,
        text=True,
        timeout=120
    )
    print(f"Exit code: {result.returncode}")
    # Check for surefire results
    surefire_dir = os.path.join(project_path, "target", "surefire-reports")
    if os.path.exists(surefire_dir):
        xmls = [f for f in os.listdir(surefire_dir) if f.endswith(".xml")]
        print(f"Surefire XMLs found: {len(xmls)}")
        for x in xmls[:5]:
            print(f"  {x}")
    else:
        print("No surefire-reports directory found")
    
    # Show last 20 lines of stdout/stderr
    output_lines = (result.stdout + "\n" + result.stderr).strip().splitlines()
    for line in output_lines[-20:]:
        print(line)
finally:
    # Restore original pom.xml
    print("\nRestoring original pom.xml...")
    with open(pom_path, "w", encoding="utf-8") as f:
        f.write(original_content)
    print("Restored.")
