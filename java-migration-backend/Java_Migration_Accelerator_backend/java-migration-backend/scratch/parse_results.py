import os
import xml.etree.ElementTree as ET

project_path = r"C:\Users\ST-Sahana\AppData\Local\Temp\migrations\a179f3fe-8bc1-4879-8f6e-456c5ab48134"

# 1. Parse Surefire XMLs
surefire_dir = os.path.join(project_path, "target", "surefire-reports")
total = 0
passed = 0
failed = 0
skipped = 0

if os.path.exists(surefire_dir):
    for f in os.listdir(surefire_dir):
        if f.endswith(".xml") and f.startswith("TEST-"):
            try:
                tree = ET.parse(os.path.join(surefire_dir, f))
                root = tree.getroot()
                
                # Check for testsuite root node
                if root.tag == "testsuite":
                    tests = int(root.attrib.get("tests", 0))
                    failures = int(root.attrib.get("failures", 0))
                    errors = int(root.attrib.get("errors", 0))
                    skips = int(root.attrib.get("skipped", 0))
                    
                    total += tests
                    failed += (failures + errors)
                    skipped += skips
            except Exception as e:
                print(f"Error parsing {f}: {e}")

passed = total - failed - skipped
print(f"Tests Run: {total}")
print(f"Passed: {passed}")
print(f"Failed: {failed}")
print(f"Skipped: {skipped}")

# 2. Parse JaCoCo XML
jacoco_xml = os.path.join(project_path, "target", "site", "jacoco", "jacoco.xml")
metrics = {}
if os.path.exists(jacoco_xml):
    try:
        tree = ET.parse(jacoco_xml)
        root = tree.getroot()
        for counter in root.findall("counter"):
            type_name = counter.attrib.get("type")
            missed = int(counter.attrib.get("missed", 0))
            covered = int(counter.attrib.get("covered", 0))
            total_elements = missed + covered
            pct = round((covered / total_elements) * 100, 2) if total_elements > 0 else 0.0
            metrics[type_name.lower()] = pct
            print(f"JaCoCo {type_name}: Missed={missed}, Covered={covered}, Coverage={pct}%")
    except Exception as e:
        print(f"Error parsing JaCoCo XML: {e}")
