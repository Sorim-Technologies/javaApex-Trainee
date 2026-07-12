import urllib.request
import json

job_id = "c6a5c454-af49-4a3a-bc1a-23572ebac325"
try:
    with urllib.request.urlopen(f"http://localhost:8001/api/migration/{job_id}") as response:
        html = response.read()
        job = json.loads(html.decode('utf-8'))
        print(f"In-memory Status - job_id: {job.get('job_id')}, status: {job.get('status')}, total: {job.get('tests_total')}, passed: {job.get('tests_passed')}")
except Exception as e:
    print(f"Error calling API: {e}")
