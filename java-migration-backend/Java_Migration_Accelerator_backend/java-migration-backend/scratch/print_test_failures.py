import os
import xml.etree.ElementTree as ET

project_path = r"C:\Users\ST-Sahana\AppData\Local\Temp\migrations\a179f3fe-8bc1-4879-8f6e-456c5ab48134"
surefire_dir = os.path.join(project_path, "target", "surefire-reports")

if os.path.exists(surefire_dir):
    for f in os.listdir(surefire_dir):
        if f.endswith(".xml") and f.startswith("TEST-"):
            try:
                tree = ET.parse(os.path.join(surefire_dir, f))
                root = tree.getroot()
                
                # Check for testsuite root node
                if root.tag == "testsuite":
                    for tc in root.findall("testcase"):
                        fail = tc.find("failure")
                        err = tc.find("error")
                        if fail is not None:
                            print(f"FAIL: {tc.attrib.get('classname')}.{tc.attrib.get('name')}: {fail.attrib.get('message') or fail.text[:200]}")
                        if err is not None:
                            print(f"ERROR: {tc.attrib.get('classname')}.{tc.attrib.get('name')}: {err.attrib.get('message') or err.text[:200]}")
            except Exception as e:
                print(f"Error parsing {f}: {e}")
