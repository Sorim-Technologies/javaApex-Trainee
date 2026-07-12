import sys
import os
sys.path.insert(0, os.getcwd())

import asyncio
import shutil
import tempfile

async def test():
    import main
    from main import migration_jobs, get_project_clone_path
    
    print(f"Loaded {len(migration_jobs)} jobs.")
    for job_id, job in list(migration_jobs.items())[:2]:
        print(f"Job: {job_id}, status: {job.status}, repo: {job.source_repo}")
        clone_path = get_project_clone_path(job)
        print(f"  Clone path: {clone_path}")

if __name__ == "__main__":
    asyncio.run(test())
