from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from .db import Base, app_now


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("provider", "provider_user_id", name="uq_users_provider_user_id"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    provider = Column(String(50), nullable=False)
    provider_user_id = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=app_now, nullable=False)
    updated_at = Column(DateTime, default=app_now, onupdate=app_now, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    last_logout_at = Column(DateTime, nullable=True)

    sessions = relationship("UserSession", back_populates="user")
    guest_usage = relationship("GuestUsage", back_populates="user", uselist=False)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(255), nullable=False, unique=True)
    provider = Column(String(50), nullable=False)
    role = Column(String(50), nullable=False)
    login_time = Column(DateTime, nullable=False)
    logout_time = Column(DateTime, nullable=True)
    last_active_time = Column(DateTime, nullable=True)
    session_status = Column(String(50), nullable=False, default="active")
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=app_now, nullable=False)
    updated_at = Column(DateTime, default=app_now, onupdate=app_now, nullable=False)

    user = relationship("User", back_populates="sessions")


class GuestUsage(Base):
    __tablename__ = "guest_usage"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, unique=True)
    migrations_used = Column(Integer, default=0, nullable=False)
    migration_limit = Column(Integer, default=3, nullable=False)
    created_at = Column(DateTime, default=app_now, nullable=False)
    updated_at = Column(DateTime, default=app_now, onupdate=app_now, nullable=False)

    user = relationship("User", back_populates="guest_usage")


class RepositoryAnalysis(Base):
    __tablename__ = "repository_analysis"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    session_id = Column(BigInteger, ForeignKey("user_sessions.id"), nullable=True)
    repository_url = Column(Text, nullable=False)
    repository_name = Column(String(255), nullable=True)
    branch_name = Column(String(255), nullable=True)
    total_files = Column(Integer, default=0, nullable=False)
    java_files = Column(Integer, default=0, nullable=False)
    build_tool = Column(String(100), nullable=True)
    detected_java_version = Column(String(50), nullable=True)
    detected_spring_boot_version = Column(String(50), nullable=True)
    api_endpoint_count = Column(Integer, default=0, nullable=False)
    dependency_count = Column(Integer, default=0, nullable=False)
    analysis_status = Column(String(50), default="completed", nullable=False)
    created_at = Column(DateTime, default=app_now, nullable=False)
    updated_at = Column(DateTime, default=app_now, onupdate=app_now, nullable=False)

class MigrationHistory(Base):
    __tablename__ = "migration_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    session_id = Column(BigInteger, ForeignKey("user_sessions.id"), nullable=True)
    repository_url = Column(Text, nullable=False)
    repository_name = Column(String(255), nullable=True)
    source_java_version = Column(String(50), nullable=True)
    target_java_version = Column(String(50), nullable=True)
    source_spring_boot_version = Column(String(50), nullable=True)
    target_spring_boot_version = Column(String(50), nullable=True)
    conversion_types = Column(Text, nullable=True)
    status = Column(String(50), nullable=False)
    migrated_repo_url = Column(Text, nullable=True)
    migrated_branch_name = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=app_now, nullable=False)
    updated_at = Column(DateTime, default=app_now, onupdate=app_now, nullable=False)
