from sqlalchemy import Column, Integer, String, DateTime
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