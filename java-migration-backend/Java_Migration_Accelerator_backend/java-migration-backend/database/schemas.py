from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    provider: str
    role: str
    migration_limit: Optional[int] = None
    migrations_used: Optional[int] = None
    remaining_migrations: Optional[int] = None

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id: int
    session_id: str
    provider: str
    role: str
    login_time: datetime
    logout_time: Optional[datetime] = None
    last_active_time: Optional[datetime] = None
    session_status: str

    class Config:
        from_attributes = True
