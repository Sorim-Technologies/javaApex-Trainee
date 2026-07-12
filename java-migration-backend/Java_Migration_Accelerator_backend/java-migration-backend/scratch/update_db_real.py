import os
import xml.etree.ElementTree as ET
from database import SessionLocal
from models import Migration

project_path = r"C:\Users\ST-Sahana\AppData\Local\Temp\migrations\a179f3fe-8bc1-4879-8f6e-456c5ab48134"
job_id = "c6a5c454-af49-4a3a-bc1a-23572ebac325"

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
test_success_rate = round((passed / total) * 100, 2) if total > 0 else 0.0

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
    except Exception as e:
        print(f"Error parsing JaCoCo XML: {e}")

# 3. Update DB
db = SessionLocal()
try:
    migration = db.query(Migration).filter(Migration.migration_id == job_id).first()
    if migration:
        print("Found migration job in database. Updating...")
        print(f"Before - total: {migration.tests_total}, passed: {migration.tests_passed}, failed: {migration.tests_failed}, line: {migration.coverage_line}, status: {migration.status}")
        
        migration.tests_total = total
        migration.tests_passed = passed
        migration.tests_failed = failed
        migration.tests_skipped = skipped
        migration.test_success_rate = test_success_rate
        migration.coverage_line = metrics.get("line", 0.0)
        migration.coverage_branch = metrics.get("branch", 0.0)
        migration.coverage_method = metrics.get("method", 0.0)
        migration.coverage_instruction = metrics.get("instruction", 0.0)
        migration.coverage_class = metrics.get("class", 0.0)
        migration.coverage_complexity = metrics.get("complexity", 0.0)
        migration.status = "completed"
        
        db.commit()
        print("Updated successfully in database!")
        
        # Verify
        db.refresh(migration)
        print(f"After - total: {migration.tests_total}, passed: {migration.tests_passed}, failed: {migration.tests_failed}, line: {migration.coverage_line}, status: {migration.status}")
    else:
        print(f"Migration job with id {job_id} not found in database.")
except Exception as e:
    db.rollback()
    print(f"Failed to update database: {e}")
finally:
    db.close()
