"""Stage 2 — transcription via hosted Whisper (OpenAI).

Uses the OpenAI audio-transcription endpoint when OPENAI_API_KEY is set and an
audio track exists. Otherwise it emits a clearly-marked stub transcript so the
pipeline stays runnable without credentials.
"""
from __future__ import annotations

import logging

from app.pipeline.base import PipelineContext

log = logging.getLogger(__name__)

_STUB_TRANSCRIPT = (
    "[stub transcript] Whisper transcription was not run because no OPENAI_API_KEY "
    "was configured or no audio track was extracted."
)


class TranscriptionStage:
    name = "transcription"

    def run(self, ctx: PipelineContext) -> None:
        if not ctx.settings.openai_api_key or not ctx.audio_key:
            log.info("transcription: using stub (key=%s, audio=%s)",
                     bool(ctx.settings.openai_api_key), bool(ctx.audio_key))
            ctx.transcript = _STUB_TRANSCRIPT
            return

        try:
            from openai import OpenAI

            client = OpenAI(api_key=ctx.settings.openai_api_key)
            audio_path = ctx.storage.local_path(ctx.audio_key)
            with open(audio_path, "rb") as fh:
                resp = client.audio.transcriptions.create(
                    model=ctx.settings.whisper_model,
                    file=fh,
                )
            ctx.transcript = resp.text
            log.info("transcription: %d chars", len(ctx.transcript or ""))
        except Exception as e:  # noqa: BLE001 — never let one stage crash the job
            log.exception("transcription failed, falling back to stub")
            ctx.transcript = f"{_STUB_TRANSCRIPT} (error: {e})"
