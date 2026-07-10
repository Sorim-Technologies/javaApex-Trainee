import requests
import time
import os
import sys
import shutil

def run_verification():
    # 1. Clear any generated tests or reports first to start fresh
    test_dir = r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\src\test\java"
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)
        print(f"Cleared existing test directory: {test_dir}")
        
    target_dir = r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\target"
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
        print(f"Cleared existing target directory: {target_dir}")

    # 2. Trigger migration
    url = "http://localhost:8001/api/migration/start"
    payload = {
        "source_repo_url": r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project",
        "target_repo_name": "test-project-migrated",
        "platform": "github",
        "source_java_version": "17",
        "target_java_version": "21",
        "conversion_types": ["java_version"],
        "run_tests": True,
        "run_sonar": False,
        "run_fossa": False,
        "fix_business_logic": True
    }
    
    print("Triggering migration...")
    response = requests.post(url, json=payload)
    if response.status_code not in (200, 201):
        print(f"Failed to trigger migration: {response.status_code} - {response.text}")
        sys.exit(1)
        
    job_data = response.json()
    job_id = job_data.get("job_id")
    print(f"Migration job created: {job_id}")

    # 3. Poll status
    status_url = f"http://localhost:8001/api/migration/{job_id}"
    completed = False
    
    for attempt in range(60): # poll for up to 5 minutes
        time.sleep(5)
        status_resp = requests.get(status_url)
        if status_resp.status_code != 200:
            print(f"Failed to get job status: {status_resp.status_code}")
            continue
            
        job = status_resp.json()
        status = job.get("status")
        progress = job.get("progress_percent")
        step = job.get("current_step")
        print(f"[{time.strftime('%X')}] Status: {status} | Progress: {progress}% | Step: {step}")
        
        if status == "completed":
            completed = True
            break
        elif status == "failed":
            print(f"Job failed! Error: {job.get('error_message')}")
            # Print last logs
            for log in job.get("migration_log", [])[-10:]:
                print(f"  Log: {log}")
            sys.exit(1)
            
    if not completed:
        print("Job timed out after 5 minutes.")
        sys.exit(1)

    # 4. Assert all metrics are correct
    status_resp = requests.get(status_url)
    final_job = status_resp.json()
    
    print("\n==============================================")
    print("FINAL MIGRATION METRICS")
    print("==============================================")
    print(f"tests_total: {final_job.get('tests_total')}")
    print(f"tests_passed: {final_job.get('tests_passed')}")
    print(f"tests_failed: {final_job.get('tests_failed')}")
    print(f"tests_skipped: {final_job.get('tests_skipped')}")
    print(f"test_success_rate: {final_job.get('test_success_rate')}%")
    print(f"tests_generated: {final_job.get('tests_generated')}")
    print(f"existing_tests_found: {final_job.get('existing_tests_found')}")
    print(f"test_framework_detected: {final_job.get('test_framework_detected')}")
    print(f"coverage_line: {final_job.get('coverage_line')}%")
    print(f"coverage_branch: {final_job.get('coverage_branch')}%")
    print(f"coverage_method: {final_job.get('coverage_method')}%")
    print(f"coverage_class: {final_job.get('coverage_class')}%")
    print(f"coverage_instruction: {final_job.get('coverage_instruction')}%")
    print(f"coverage_complexity: {final_job.get('coverage_complexity')}%")
    print("==============================================")
    
    # Assertions
    assert final_job.get("tests_total") > 0, "Expected tests_total > 0"
    assert final_job.get("tests_passed") > 0, "Expected tests_passed > 0"
    assert final_job.get("tests_failed") == 0, "Expected tests_failed == 0"
    assert final_job.get("tests_generated") > 0, "Expected tests_generated > 0"
    assert final_job.get("existing_tests_found") is False, "Expected existing_tests_found to be False"
    assert final_job.get("coverage_line") > 0.0, "Expected coverage_line > 0.0"
    
    print("ALL METRICS ASSERTIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_verification()
