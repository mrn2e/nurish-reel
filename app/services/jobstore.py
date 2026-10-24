"""Persistence for jobs, backed by the SQLAlchemy `jobs` table."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from app.db import JobRow, SessionLocal
from app.models.job import Job, JobStatus


def _row_to_job(row: JobRow) -> Job:
    return Job(
        id=row.id,
        user_id=row.user_id,
        status=JobStatus(row.status),
        current_stage=row.current_stage,
        video_key=row.video_key,
        error=row.error,
        result=row.result,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def create_job(user_id: str, video_key: str) -> Job:
    now = datetime.now(timezone.utc)
    job = Job(
        id=uuid.uuid4().hex,
        user_id=user_id,
        status=JobStatus.PENDING,
        video_key=video_key,
        created_at=now,
        updated_at=now,
    )
    with SessionLocal() as s:
        s.add(
            JobRow(
                id=job.id,
                user_id=job.user_id,
                status=job.status.value,
                current_stage=job.current_stage,
                video_key=job.video_key,
                error=job.error,
                result=job.result,
                created_at=job.created_at,
                updated_at=job.updated_at,
            )
        )
        s.commit()
    return job


def get_job(job_id: str) -> Optional[Job]:
    with SessionLocal() as s:
        row = s.get(JobRow, job_id)
        return _row_to_job(row) if row else None


def update_job(
    job_id: str,
    *,
    status: Optional[JobStatus] = None,
    current_stage: Optional[str] = None,
    error: Optional[str] = None,
    result: Optional[dict[str, Any]] = None,
) -> Optional[Job]:
    with SessionLocal() as s:
        row = s.get(JobRow, job_id)
        if row is None:
            return None
        if status is not None:
            row.status = status.value
        if current_stage is not None:
            row.current_stage = current_stage
        if error is not None:
            row.error = error
        if result is not None:
            row.result = result
        row.updated_at = datetime.now(timezone.utc)
        s.commit()
        return _row_to_job(row)
