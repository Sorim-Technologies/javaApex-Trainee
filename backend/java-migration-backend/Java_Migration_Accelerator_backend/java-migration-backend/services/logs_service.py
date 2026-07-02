from typing import Any, Dict, Optional
 
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
 
from database.db import get_db
from database.models import MigrationHistory, RepositoryAnalysis
from services.social_auth_service import get_current_app_user
 
from fastapi import HTTPException
from database.models import MigrationHistory, MigrationConsoleLog
 
router = APIRouter(prefix="/api/logs", tags=["Logs"])
 
 
def normalize_filter(value: Optional[str]) -> Optional[str]:
    value = (value or "").strip()
    return None if not value or value.lower() == "all" else value
 
 
def safe_count(value: Optional[int]) -> int:
    return int(value or 0)
 
 
@router.get("/summary")
def get_logs_summary(
    current_user: Dict[str, Any] = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    user_id = current_user["user_id"]
    latest_migration = (
        db.query(MigrationHistory)
        .filter(MigrationHistory.user_id == user_id)
        .order_by(MigrationHistory.created_at.desc())
        .first()
    )
 
    return {
        "total_migrations": db.query(MigrationHistory).filter(MigrationHistory.user_id == user_id).count(),
        "successful_migrations": db.query(MigrationHistory).filter(
            MigrationHistory.user_id == user_id,
            MigrationHistory.status == "completed",
        ).count(),
        "failed_migrations": db.query(MigrationHistory).filter(
            MigrationHistory.user_id == user_id,
            MigrationHistory.status == "failed",
        ).count(),
        "total_repository_analyses": db.query(RepositoryAnalysis).filter(
            RepositoryAnalysis.user_id == user_id,
        ).count(),
        "latest_migration_status": latest_migration.status if latest_migration else None,
    }
 
 
@router.get("/migrations")
def get_migration_logs(
    status: Optional[str] = Query(default="all"),
    search: Optional[str] = Query(default=""),
    current_user: Dict[str, Any] = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    status_filter = normalize_filter(status)
    search_filter = (search or "").strip()
    query = db.query(MigrationHistory).filter(MigrationHistory.user_id == current_user["user_id"])
 
    if status_filter:
        query = query.filter(MigrationHistory.status == status_filter)
    if search_filter:
        search_like = f"%{search_filter}%"
        query = query.filter(or_(
            MigrationHistory.repository_url.ilike(search_like),
            MigrationHistory.repository_name.ilike(search_like),
            MigrationHistory.source_java_version.ilike(search_like),
            MigrationHistory.target_java_version.ilike(search_like),
            MigrationHistory.conversion_types.ilike(search_like),
            MigrationHistory.error_message.ilike(search_like),
        ))
 
    records = query.order_by(MigrationHistory.created_at.desc()).all()
    return [
        {
            "id": record.id,
            "repository_name": record.repository_name,
            "repository_url": record.repository_url,
            "source_java_version": record.source_java_version,
            "target_java_version": record.target_java_version,
            "source_spring_boot_version": record.source_spring_boot_version,
            "target_spring_boot_version": record.target_spring_boot_version,
            "conversion_types": record.conversion_types,
            "status": record.status,
            "migrated_repo_url": record.migrated_repo_url,
            "migrated_branch_name": record.migrated_branch_name,
            "error_message": record.error_message,
            "started_at": record.started_at,
            "completed_at": record.completed_at,
        }
        for record in records
    ]
 
 
@router.get("/repository-analysis")
def get_repository_analysis_logs(
    search: Optional[str] = Query(default=""),
    current_user: Dict[str, Any] = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    search_filter = (search or "").strip()
    query = db.query(RepositoryAnalysis).filter(RepositoryAnalysis.user_id == current_user["user_id"])
 
    if search_filter:
        search_like = f"%{search_filter}%"
        query = query.filter(or_(
            RepositoryAnalysis.repository_url.ilike(search_like),
            RepositoryAnalysis.repository_name.ilike(search_like),
            RepositoryAnalysis.build_tool.ilike(search_like),
            RepositoryAnalysis.detected_java_version.ilike(search_like),
            RepositoryAnalysis.detected_spring_boot_version.ilike(search_like),
        ))
 
    records = query.order_by(RepositoryAnalysis.created_at.desc()).all()
    return [
        {
            "id": record.id,
            "repository_name": record.repository_name,
            "repository_url": record.repository_url,
            "total_files": safe_count(record.total_files),
            "java_files": safe_count(record.java_files),
            "build_tool": record.build_tool,
            "detected_java_version": record.detected_java_version,
            "detected_spring_boot_version": record.detected_spring_boot_version,
            "api_endpoint_count": safe_count(record.api_endpoint_count),
            "dependency_count": safe_count(record.dependency_count),
            "created_at": record.created_at,
        }
        for record in records
    ]
 

@router.get("/migration/{migration_id}")
def get_migration_console_logs(
    migration_id: int,
    current_user: Dict[str, Any] = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    migration = (
        db.query(MigrationHistory)
        .filter(
            MigrationHistory.id == migration_id,
            MigrationHistory.user_id == current_user["user_id"],
        )
        .first()
    )

    if not migration:
        raise HTTPException(status_code=404, detail="Migration not found")

    logs = (
        db.query(MigrationConsoleLog)
        .filter(MigrationConsoleLog.migration_id == migration_id)
        .order_by(MigrationConsoleLog.id.asc())
        .all()
    )

    return [
        {
            "id": log.id,
            "timestamp": log.timestamp,
            "level": log.level,
            "message": log.message,
        }
        for log in logs
    ]