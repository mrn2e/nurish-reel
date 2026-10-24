"""Stage 3 — OCR over extracted keyframes (pytesseract / Tesseract).

Reads any on-screen text (ingredient overlays, measurements) from the keyframes
produced by media extraction. Degrades to a no-op when Tesseract isn't
installed or there are no frames.
"""
from __future__ import annotations

import logging

from app.pipeline.base import PipelineContext

log = logging.getLogger(__name__)


class OcrStage:
    name = "ocr"

    def run(self, ctx: PipelineContext) -> None:
        if not ctx.keyframe_keys:
            log.info("ocr: no keyframes, skipping")
            return

        try:
            import pytesseract
            from PIL import Image
        except Exception:  # noqa: BLE001
            log.warning("ocr: pytesseract/Pillow unavailable, skipping")
            return

        seen: set[str] = set()
        lines: list[str] = []
        for key in ctx.keyframe_keys:
            try:
                img_path = ctx.storage.local_path(key)
                text = pytesseract.image_to_string(Image.open(img_path)).strip()
            except Exception as e:  # noqa: BLE001 — bad frame or missing binary
                log.debug("ocr: frame %s failed: %s", key, e)
                continue
            for raw in text.splitlines():
                line = raw.strip()
                # De-dupe: on-screen text persists across consecutive frames.
                if len(line) > 2 and line.lower() not in seen:
                    seen.add(line.lower())
                    lines.append(line)

        ctx.ocr_text = "\n".join(lines) if lines else None
        log.info("ocr: %d unique lines", len(lines))
