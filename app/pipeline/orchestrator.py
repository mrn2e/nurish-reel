"""Runs the pipeline stages in order for one job and persists progress.

This is the function handed to the background worker. Each stage updates the
job's `current_stage`; a failure in any stage marks the job FAILED with the
error, while per-stage internal fallbacks keep expected gaps (missing keys,
missing binaries) from failing the whole job.
"""
from __future__ import annotations

import logging

from app.config import get_settings
from app.models.job import JobStatus
from app.pipeline.base import PipelineContext
from app.pipeline.captions import CaptionStage
from app.pipeline.media_extraction import MediaExtractionStage
from app.pipeline.nutrition import NutritionStage
from app.pipeline.ocr import OcrStage
from app.pipeline.shopping_list import ShoppingListStage
from app.pipeline.structuring import StructuringStage
from app.pipeline.transcription import TranscriptionStage
from app.services import jobstore
from app.services.storage import build_storage

log = logging.getLogger(__name__)

# Ordered list of stages. Swap/reorder here — nothing else needs to change.
STAGES = [
    MediaExtractionStage(),
    TranscriptionStage(),
    OcrStage(),
    CaptionStage(),
    StructuringStage(),
    NutritionStage(),
    ShoppingListStage(),
]


def run_pipeline(job_id: str) -> None:
    settings = get_settings()
    job = jobstore.get_job(job_id)
    if job is None:
        log.error("run_pipeline: job %s not found", job_id)
        return

    ctx = PipelineContext(
        job_id=job.id,
        video_key=job.video_key or "",
        settings=settings,
        storage=build_storage(settings),
    )

    jobstore.update_job(job_id, status=JobStatus.PROCESSING)
    try:
        for stage in STAGES:
            log.info("job %s -> stage %s", job_id, stage.name)
            jobstore.update_job(job_id, current_stage=stage.name)
            stage.run(ctx)

        result = ctx.to_result()
        jobstore.update_job(
            job_id,
            status=JobStatus.COMPLETED,
            current_stage=None,
            result=result.model_dump(),
        )
        log.info("job %s completed", job_id)
    except Exception as e:  # noqa: BLE001
        log.exception("job %s failed", job_id)
        jobstore.update_job(job_id, status=JobStatus.FAILED, error=str(e))
