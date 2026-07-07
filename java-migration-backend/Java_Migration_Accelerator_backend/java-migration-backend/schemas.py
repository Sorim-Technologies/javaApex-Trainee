from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MigrationCreate(BaseModel):
    repository_name: str = Field(..., min_length=1, description="Name of the source repository")
    target_repository: str = Field(..., min_length=1, description="Name of the target repository")
    migration_id: str = Field(..., min_length=1, description="Unique migration identifier")
    migration_date: Optional[datetime] = Field(default_factory=datetime.utcnow)
    version_before: str = Field(..., min_length=1, description="Version before migration")
    version_after: str = Field(..., min_length=1, description="Version after migration")
    status: str = Field(default="Pending", min_length=1, description="Migration status")
