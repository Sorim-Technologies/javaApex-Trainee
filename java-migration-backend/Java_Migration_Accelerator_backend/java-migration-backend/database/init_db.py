from .db import Base, engine, ensure_database_exists
from . import models  # noqa: F401


def init_db():
    ensure_database_exists()
    Base.metadata.create_all(bind=engine)
