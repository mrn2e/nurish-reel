"""Job model describing the lifecycle of one video-processing request."""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Ordered pipeline stages — surfaced to the client so the UI can show progress.
PIPELINE_STAGES = [
    "media_extraction",
    "transcription",
    "ocr",
    "captions",
    "structuring",
    "nutrition",
    "shopping_list",
]


class Job(BaseModel):
    id: str
    user_id: str
    status: JobStatus = JobStatus.PENDING
    current_stage: Optional[str] = None
    video_key: Optional[str] = Field(None, description="Object-storage key of the uploaded video")
    error: Optional[str] = None
    result: Optional[dict[str, Any]] = Field(None, description="Serialized RecipeResult")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
