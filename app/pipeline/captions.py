"""Stage 4 — subtitle/caption track extraction.

Parses a sidecar subtitle track (SRT or WebVTT) uploaded alongside the video,
if present, into plain text. This is intentionally distinct from OCR: OCR reads
burned-in on-screen text from frames, whereas this reads a structured caption
file.

The subtitle object key convention is `uploads/<job_id>/captions.(srt|vtt)`.
"""
from __future__ import annotations

import logging

from app.pipeline.base import PipelineContext

log = logging.getLogger(__name__)


class CaptionStage:
    name = "captions"

    def run(self, ctx: PipelineContext) -> None:
        for ext in ("srt", "vtt"):
            key = f"uploads/{ctx.job_id}/captions.{ext}"
            try:
                raw = ctx.storage.load_bytes(key).decode("utf-8", errors="ignore")
            except Exception:  # noqa: BLE001 — object simply not present
                continue
            ctx.caption_text = self._parse(raw, ext)
            if ctx.caption_text:
                log.info("captions: parsed %s (%d chars)", ext, len(ctx.caption_text))
            return
        log.info("captions: no subtitle track found")

    @staticmethod
    def _parse(raw: str, ext: str) -> str:
        try:
            if ext == "srt":
                import pysrt
                subs = pysrt.from_string(raw)
                return "\n".join(s.text.replace("\n", " ") for s in subs)
            else:  # vtt
                import io
                import webvtt
                captions = webvtt.read_buffer(io.StringIO(raw))
                return "\n".join(c.text.replace("\n", " ") for c in captions)
        except Exception as e:  # noqa: BLE001
            log.warning("captions: parse failed (%s): %s", ext, e)
            # Fallback: strip obvious timing/index lines so we still get text.
            kept = [
                ln.strip() for ln in raw.splitlines()
                if ln.strip() and "-->" not in ln and not ln.strip().isdigit()
                and ln.strip().upper() != "WEBVTT"
            ]
            return "\n".join(kept)
