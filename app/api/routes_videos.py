"""Video upload and job-status endpoints.

Flow:
  POST /api/videos            -> upload video (+ optional subtitle track),
                                 create a job, enqueue processing, return job id
  GET  /api/videos/{job_id}   -> poll job status / current stage
  GET  /api/videos/{job_id}/result -> fetch the RecipeResult once completed
"""
from __future__ import annotations

from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel

from app.api.deps import CurrentUser, get_current_user
from app.config import get_settings
from app.models.job import Job, JobStatus
from app.pipeline.orchestrator import run_pipeline
from app.services import jobstore
from app.services.storage import build_storage

router = APIRouter(prefix="/api/videos", tags=["videos"])

# Only formats that play on practically every device are accepted.
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "webm"}
ALLOWED_VIDEO_CONTENT_TYPES = {"video/mp4", "video/webm", "application/octet-stream"}


class JobCreatedResponse(BaseModel):
    job_id: str
    status: JobStatus


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    current_stage: Optional[str] = None
    error: Optional[str] = None


def _to_status(job: Job) -> JobStatusResponse:
    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        current_stage=job.current_stage,
        error=job.error,
    )


@router.post("", response_model=JobCreatedResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(..., description="Video file to process"),
    captions: Optional[UploadFile] = File(
        None, description="Optional subtitle track (.srt or .vtt)"
    ),
    user: CurrentUser = Depends(get_current_user),
) -> JobCreatedResponse:
    settings = get_settings()
    storage = build_storage(settings)

    # Persist the video first so we have a stable key, then create the job.
    import uuid

    upload_id = uuid.uuid4().hex
    suffix = (video.filename or "video").rsplit(".", 1)[-1].lower()
    if suffix not in ALLOWED_VIDEO_EXTENSIONS or (
        video.content_type and video.content_type not in ALLOWED_VIDEO_CONTENT_TYPES
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported video type. Upload an MP4 or WebM file.",
        )
    video_key = f"uploads/{upload_id}/source.{suffix}"
    storage.save_bytes(video_key, await video.read())

    job = jobstore.create_job(user_id=user.id, video_key=video_key)

    # The caption convention is keyed on the job id; re-key under it now.
    if captions is not None:
        cext = "vtt" if (captions.filename or "").lower().endswith("vtt") else "srt"
        storage.save_bytes(f"uploads/{job.id}/captions.{cext}", await captions.read())

    # NOTE: BackgroundTasks is the dev worker. Swap this line for a Celery/RQ
    # enqueue (e.g. run_pipeline.delay(job.id)) in production — nothing else changes.
    background_tasks.add_task(run_pipeline, job.id)

    return JobCreatedResponse(job_id=job.id, status=job.status)


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_status(
    job_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> JobStatusResponse:
    job = jobstore.get_job(job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    return _to_status(job)


@router.get("/{job_id}/result")
async def get_result(
    job_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    job = jobstore.get_job(job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=409,
            detail=f"Job is {job.status.value}, result not ready",
        )
    return job.result
