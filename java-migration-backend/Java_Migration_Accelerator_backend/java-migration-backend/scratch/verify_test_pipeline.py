import sys
import os
sys.path.insert(0, os.getcwd())

import asyncio
from services.testing.test_execution_service import TestExecutionService

async def main():
    executor = TestExecutionService()
    project_path = r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project"
    
    if os.path.exists(project_path):
        res = await executor.execute_tests(project_path, "maven")
        print("\n=== STDOUT ===")
        print(res["stdout"])
        print("\n=== STDERR ===")
        print(res["stderr"])

if __name__ == "__main__":
    asyncio.run(main())
