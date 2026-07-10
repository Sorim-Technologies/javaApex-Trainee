import requests
import time
import os
import sys
import shutil

def run_verification():
    calculator_path = r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\src\main\java\com\example\Calculator.java"
    backup_path = calculator_path + ".backup"
    
    # 1. Back up the original Calculator.java
    if not os.path.exists(calculator_path):
        print(f"Error: Calculator.java not found at {calculator_path}")
        sys.exit(1)
        
    shutil.copyfile(calculator_path, backup_path)
    print(f"Created backup of Calculator.java at {backup_path}")

    try:
        # 2. Introduce a syntax error (missing semicolon on line 6)
        with open(calculator_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        # Modify line 6 (index 5) to remove semicolon
        lines[5] = "        return a + b\n" # No semicolon
        
        with open(calculator_path, "w", encoding="utf-8") as f:
            f.writelines(lines)
        print("Deliberately introduced syntax error in Calculator.java (removed semicolon on line 6).")

        # Commit the syntax error to Git so it is cloned by the backend
        import subprocess
        subprocess.run(["git", "add", "src/main/java/com/example/Calculator.java"], cwd=r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project", shell=True)
        subprocess.run(["git", "commit", "-m", "Introduce syntax error for testing"], cwd=r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project", shell=True)
        print("Committed syntax error to local git repository.")

        # Clear any generated tests or reports first
        test_dir = r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\src\test\java"
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
            
        target_dir = r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\target"
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir)

        # 3. Trigger migration
        url = "http://localhost:8001/api/migration/start"
        payload = {
            "source_repo_url": r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project",
            "target_repo_name": "test-project-migrated-repair",
            "platform": "github",
            "source_java_version": "17",
            "target_java_version": "21",
            "conversion_types": ["java_version"],
            "run_tests": True,
            "run_sonar": False,
            "run_fossa": False,
            "fix_business_logic": True
        }
        
        print("Triggering migration with compilation repair enabled...")
        response = requests.post(url, json=payload)
        if response.status_code not in (200, 201):
            print(f"Failed to trigger migration: {response.status_code} - {response.text}")
            sys.exit(1)
            
        job_data = response.json()
        job_id = job_data.get("job_id")
        print(f"Migration job created: {job_id}")

        # 4. Poll status and inspect logs for repair events
        status_url = f"http://localhost:8001/api/migration/{job_id}"
        completed = False
        compilation_failed_logged = False
        repair_attempt_logged = False
        repair_success_logged = False
        
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
            
            # Inspect logs for self-healing repair events
            logs = job.get("migration_log", [])
            for log in logs:
                if "Compilation failed with 1 unique compiler error" in log:
                    compilation_failed_logged = True
                if "Attempting to repair Calculator.java" in log:
                    repair_attempt_logged = True
                if "Successfully applied repairs to Calculator.java" in log:
                    repair_success_logged = True

            if status == "completed":
                completed = True
                break
            elif status == "failed":
                print(f"Job failed! Error: {job.get('error_message')}")
                for log in logs[-15:]:
                    print(f"  Log: {log}")
                sys.exit(1)
                
        if not completed:
            print("Job timed out after 5 minutes.")
            sys.exit(1)

        # 5. Check if Calculator.java is fixed
        with open(calculator_path, "r", encoding="utf-8") as f:
            fixed_content = f.read()
            
        # Semicolon should be back
        assert ";" in fixed_content, "Repaired Calculator.java should contain a semicolon."
        print("\nVerification passed: Semicolon was successfully restored in Calculator.java!")
        
        # Verify that all repair log events were triggered
        assert compilation_failed_logged, "Expected log to show compilation failure."
        assert repair_attempt_logged, "Expected log to show repair attempt."
        assert repair_success_logged, "Expected log to show successful repair application."
        print("Verification passed: Self-healing logs correctly tracked the repair loop.")
        
        print("\n==============================================")
        print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("==============================================")

    finally:
        # Restore original Calculator.java and reset git commit
        import subprocess
        subprocess.run(["git", "reset", "--hard", "HEAD~1"], cwd=r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project", shell=True)
        if os.path.exists(backup_path):
            shutil.copyfile(backup_path, calculator_path)
            os.remove(backup_path)
            print("Restored original Calculator.java from backup.")

if __name__ == "__main__":
    run_verification()
