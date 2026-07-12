import os, re

project_path = r"C:\Users\ST-Sahana\AppData\Local\Temp\migrations\7c0f3650-4284-4c8e-be13-cc39afd4b922"
sys_version = 21

pom_path = os.path.join(project_path, "pom.xml")
with open(pom_path, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

patterns = [
    (r"<java\.version>(\d+)</java\.version>", r"<java.version>{sys_ver}</java.version>"),
    (r"<maven\.compiler\.source>(\d+)</maven\.compiler\.source>", r"<maven.compiler.source>{sys_ver}</maven.compiler.source>"),
    (r"<maven\.compiler\.target>(\d+)</maven\.compiler\.target>", r"<maven.compiler.target>{sys_ver}</maven.compiler.target>"),
    (r"<release>(\d+)</release>", r"<release>{sys_ver}</release>"),
]

for pat, repl in patterns:
    m = re.search(pat, content)
    if m:
        proj_ver = int(m.group(1))
        print(f"Found pattern: {pat}, project version: {proj_ver}, sys version: {sys_version}")
        if proj_ver > sys_version:
            content = re.sub(pat, repl.format(sys_ver=sys_version), content)
            print(f"  -> Would patch to {sys_version}")
        else:
            print(f"  -> No patch needed (proj_ver <= sys_version)")
    else:
        print(f"Pattern not found: {pat}")

# Check if the result has the correct version
m2 = re.search(r"<java\.version>(\d+)</java\.version>", content)
if m2:
    print(f"\nAfter patching: <java.version>{m2.group(1)}</java.version>")
