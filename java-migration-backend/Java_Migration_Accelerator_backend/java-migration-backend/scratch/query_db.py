from database import SessionLocal
from models import Migration

db = SessionLocal()
try:
    migrations = db.query(Migration).order_by(Migration.migration_date.desc()).limit(10).all()
    for m in migrations:
        print(f"ID: {m.migration_id}, Date: {m.migration_date}, Repo: {m.repository_name}, Status: {m.status}, total: {m.tests_total}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
