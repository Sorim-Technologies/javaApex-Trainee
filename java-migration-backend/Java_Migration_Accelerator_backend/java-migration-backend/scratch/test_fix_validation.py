import asyncio
import os
import sys
import shutil

# Setup PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.testing.compilation_repair import CompilationRepairService
from services.testing.test_execution_service import TestExecutionService
from services.testing.test_generator import TestGenerator

async def main():
    project_path = r"C:\Users\ST-Sahana\AppData\Local\Temp\migrations\fe18d0d4-0e37-4bbe-8fdf-0f10702b4196"
    build_tool = "maven"
    java_version = "25"
    
    def log_cb(msg):
        print(f"[Log] {msg}")
        
    print("--- 1. Testing Compilation Repair Service ---")
    repair_service = CompilationRepairService()
    
    # Run the syntax fixes
    repair_service.fix_misplaced_semicolons(project_path, log_cb)
    repair_service.fix_factory_new_instance(project_path, log_cb)
    
    # 1. Clear old test classes to let us regenerate them clean
    print("\nClearing old generated test files from staging...")
    test_java_dir = os.path.join(project_path, "src", "test", "java", "com", "example", "project")
    if os.path.exists(test_java_dir):
        for root, dirs, files in os.walk(test_java_dir):
            for file in files:
                if file.endswith(".java") and file != "ProjectApplicationTests.java":
                    file_path = os.path.join(root, file)
                    os.remove(file_path)
                    print(f"  Deleted: {os.path.basename(file_path)}")
                    
    # 2. Run test generator to generate compiling tests using the new TestCodeGenerator
    print("\n--- 2. Regenerating test classes ---")
    generator = TestGenerator()
    gen_result = await generator.generate_tests_for_project(
        project_path=project_path,
        progress_callback=lambda c, t, m: print(f"  [Progress {c}/{t}] {m}"),
        log_callback=log_cb
    )
    
    print("\nGeneration Result:")
    for k, v in gen_result.items():
        print(f"  {k}: {v}")
        
    print("\n--- 3. Testing Test Execution Service ---")
    executor = TestExecutionService()
    exec_result = await executor.execute_tests(project_path, build_tool)
    
    print("\nTest Execution Result:")
    for k, v in exec_result.items():
        if k in ["stdout", "stderr"]:
            print(f"  {k}: length={len(v)}")
        else:
            print(f"  {k}: {v}")

if __name__ == "__main__":
    asyncio.run(main())
