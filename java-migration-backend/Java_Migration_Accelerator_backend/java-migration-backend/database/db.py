import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker


BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parents[2]

load_dotenv(ROOT_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")

MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
MYSQL_PORT = os.environ.get("MYSQL_PORT", "3306")
MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE", "javaapex_db")
MYSQL_USER = os.environ.get("MYSQL_USER", "root")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "admin")
APP_TIMEZONE = os.environ.get("APP_TIMEZONE", "Asia/Kolkata")

DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
)
MYSQL_SERVER_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def app_now() -> datetime:
    try:
        app_timezone = ZoneInfo(APP_TIMEZONE)
    except ZoneInfoNotFoundError:
        app_timezone = timezone(timedelta(hours=5, minutes=30))

    return datetime.now(app_timezone).replace(tzinfo=None)


def ensure_database_exists():
    server_engine = create_engine(MYSQL_SERVER_URL, pool_pre_ping=True)
    try:
        with server_engine.connect() as connection:
            connection.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            connection.commit()
    finally:
        server_engine.dispose()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
