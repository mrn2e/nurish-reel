"""Stage 2 — transcription via Gemini (google-generativeai).

Transcribes the extracted audio track using the same Gemini API key that powers
the structuring stage, so a single key drives the whole LLM path and no separate
(paid) speech-to-text provider is required.

Behaviour:
  - If GEMINI_API_KEY is set AND an audio track was extracted, send the audio to
    Gemini with a verbatim-transcription instruction and use the returned text.
  - Otherwise emit a clearly-marked stub transcript so the pipeline stays
    runnable without credentials.

Small files (< ~20 MB) are sent inline with the request; larger files are
uploaded via the File API first. Either way, any failure degrades to the stub
rather than crashing the job.
"""
from __future__ import annotations

import logging
import mimetypes
import os

from app.pipeline.base import PipelineContext

log = logging.getLogger(__name__)

# Gemini accepts inline audio comfortably below ~20 MB; above that, go via the
# File API. The total inline request payload must stay under 20 MB.
_INLINE_MAX_BYTES = 18 * 1024 * 1024

_TRANSCRIBE_PROMPT = (
    "Transcribe the spoken words in this audio verbatim. Output only the "
    "transcript text with no commentary, labels, timestamps, or speaker names. "
    "If there is no intelligible speech, output an empty response."
)

_STUB_TRANSCRIPT = (
    "[stub transcript] Gemini transcription was not run because no GEMINI_API_KEY "
    "was configured or no audio track was extracted."
)


def _guess_mime(path: str) -> str:
    mime, _ = mimetypes.guess_type(path)
    # ffmpeg extracts to .mp3 in the media stage; default to that when unknown.
    return mime or "audio/mpeg"


class TranscriptionStage:
    name = "transcription"

    def run(self, ctx: PipelineContext) -> None:
        if not ctx.settings.gemini_api_key or not ctx.audio_key:
            log.info("transcription: using stub (key=%s, audio=%s)",
                     bool(ctx.settings.gemini_api_key), bool(ctx.audio_key))
            ctx.transcript = _STUB_TRANSCRIPT
            return

        try:
            import google.generativeai as genai

            genai.configure(api_key=ctx.settings.gemini_api_key)
            # Dedicated transcription model; fall back to the structuring model
            # when gemini_transcription_model is left blank.
            model_name = (
                ctx.settings.gemini_transcription_model or ctx.settings.gemini_model
            )
            model = genai.GenerativeModel(model_name)
            log.info("transcription: using model %s", model_name)

            audio_path = ctx.storage.local_path(ctx.audio_key)
            mime = _guess_mime(audio_path)
            size = os.path.getsize(audio_path)

            if size <= _INLINE_MAX_BYTES:
                with open(audio_path, "rb") as fh:
                    audio_part = {"mime_type": mime, "data": fh.read()}
                resp = model.generate_content([_TRANSCRIBE_PROMPT, audio_part])
            else:
                # Large file: upload via the File API, then reference it.
                log.info("transcription: audio %d bytes > inline limit, using File API", size)
                uploaded = genai.upload_file(path=audio_path, mime_type=mime)
                resp = model.generate_content([_TRANSCRIBE_PROMPT, uploaded])
                try:
                    genai.delete_file(uploaded.name)
                except Exception:  # noqa: BLE001 — cleanup is best-effort
                    log.debug("transcription: could not delete uploaded file %s", uploaded.name)

            ctx.transcript = (resp.text or "").strip()
            log.info("transcription: %d chars", len(ctx.transcript or ""))
        except Exception as e:  # noqa: BLE001 — never let one stage crash the job
            log.exception("transcription failed, falling back to stub")
            ctx.transcript = f"{_STUB_TRANSCRIPT} (error: {e})"
