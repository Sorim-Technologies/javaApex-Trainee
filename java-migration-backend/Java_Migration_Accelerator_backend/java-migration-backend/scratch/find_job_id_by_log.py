from database import SessionLocal
from models import Migration
import json

db = SessionLocal()
try:
    migrations = db.query(Migration).all()
    for m in migrations:
        log_str = str(m.migration_log or '')
        if "a179f3fe-8bc1-4879-8f6e-456c5ab48134" in log_str:
            print(f"MATCH: ID: {m.migration_id}, Date: {m.migration_date}, Repo: {m.repository_name}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
