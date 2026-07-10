from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean
from datetime import datetime

from database import Base


class Migration(Base):
    __tablename__ = "migration_history"

    id = Column(Integer, primary_key=True, index=True)
    repository_name = Column(String(255), nullable=False)
    target_repository = Column(String(255), nullable=False)
    migration_id = Column(String(100), unique=True, nullable=False)
    migration_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    version_before = Column(String(50), nullable=False)
    version_after = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)

    # Added fields for test execution & coverage results
    tests_total = Column(Integer, default=0, nullable=False)
    tests_passed = Column(Integer, default=0, nullable=False)
    tests_failed = Column(Integer, default=0, nullable=False)
    tests_skipped = Column(Integer, default=0, nullable=False)
    test_success_rate = Column(Float, default=0.0, nullable=False)
    test_execution_time_seconds = Column(Float, default=0.0, nullable=False)
    tests_generated = Column(Integer, default=0, nullable=False)
    existing_tests_found = Column(Boolean, default=False, nullable=False)
    existing_test_classes = Column(Integer, default=0, nullable=False)
    test_framework_detected = Column(String(50), nullable=True)
    coverage_line = Column(Float, default=0.0, nullable=False)
    coverage_branch = Column(Float, default=0.0, nullable=False)
    coverage_method = Column(Float, default=0.0, nullable=False)
    coverage_class = Column(Float, default=0.0, nullable=False)
    coverage_instruction = Column(Float, default=0.0, nullable=False)
    coverage_complexity = Column(Float, default=0.0, nullable=False)
