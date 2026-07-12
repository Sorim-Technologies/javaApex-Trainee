import subprocess, re

output = subprocess.check_output(["java", "-version"], stderr=subprocess.STDOUT).decode("utf-8", errors="ignore")
print("Raw output:", repr(output))
m = re.search(r'version "(\d+)', output) or re.search(r'(?:openjdk|java|version) (\d+)', output)
if m:
    ver = m.group(1)
    print("Detected version:", ver)
    if ver.startswith("1."):
        print("Final:", int(ver.split(".")[1]))
    else:
        print("Final:", int(ver))
else:
    print("No match found")
