"""SQLAlchemy engine/session setup.

SQLite by default; set DATABASE_URL to a Postgres URL for prod with no code
changes. One table — `jobs` — persists job state as JSON columns to keep the
schema simple while the domain models evolve.
"""
from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import JSON, Column, DateTime, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()

# Ensure the parent dir exists for file-based SQLite URLs.
if settings.database_url.startswith("sqlite:///"):
    db_path = settings.database_url.replace("sqlite:///", "", 1)
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base = declarative_base()


class JobRow(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True)
    user_id = Column(String, index=True, nullable=False)
    status = Column(String, nullable=False)
    current_stage = Column(String, nullable=True)
    video_key = Column(String, nullable=True)
    error = Column(String, nullable=True)
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
