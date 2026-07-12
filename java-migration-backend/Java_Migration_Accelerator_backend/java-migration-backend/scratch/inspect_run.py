from database import SessionLocal
from models import Migration

db = SessionLocal()
try:
    migrations = db.query(Migration).all()
    print(f"Found {len(migrations)} migration runs in the database.")
    for m in migrations:
        print(f"\n=================== Migration ID: {m.migration_id} ===================")
        print(f"Repo: {m.repository_name} -> {m.target_repository}")
        print(f"Status: {m.status}")
        print(f"Tests Generated: {m.tests_generated}")
        print(f"Tests Total: {m.tests_total}, Passed: {m.tests_passed}, Failed: {m.tests_failed}")
        print(f"Coverage: Line={m.coverage_line}%, Branch={m.coverage_branch}%")
        print(f"JMeter: AvgRT={m.jmeter_average_response_time}, Throughput={m.jmeter_throughput}")
except Exception as e:
    print(f"Error querying DB: {e}")
finally:
    db.close()
