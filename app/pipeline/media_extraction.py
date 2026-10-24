"""Stage 1 — media extraction via ffmpeg.

Pulls an audio track (for transcription) and periodic keyframes (for OCR) out
of the uploaded video. If ffmpeg is unavailable (e.g. CI without the binary),
the stage degrades gracefully: downstream stages just see no audio/keyframes
and fall back to their own stubs.
"""
from __future__ import annotations

import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

from app.pipeline.base import PipelineContext

log = logging.getLogger(__name__)


class MediaExtractionStage:
    name = "media_extraction"

    # Extract one keyframe every N seconds for OCR.
    KEYFRAME_INTERVAL_S = 5

    def run(self, ctx: PipelineContext) -> None:
        if shutil.which("ffmpeg") is None:
            log.warning("ffmpeg not found on PATH; skipping media extraction")
            return

        video_path = ctx.storage.local_path(ctx.video_key)
        job_prefix = f"jobs/{ctx.job_id}"

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)

            # --- audio ---
            audio_file = tmp_path / "audio.mp3"
            self._run_ffmpeg([
                "ffmpeg", "-y", "-i", video_path,
                "-vn", "-acodec", "libmp3lame", "-q:a", "4",
                str(audio_file),
            ])
            if audio_file.exists():
                ctx.audio_key = ctx.storage.save_file(f"{job_prefix}/audio.mp3", str(audio_file))

            # --- keyframes ---
            frames_dir = tmp_path / "frames"
            frames_dir.mkdir()
            self._run_ffmpeg([
                "ffmpeg", "-y", "-i", video_path,
                "-vf", f"fps=1/{self.KEYFRAME_INTERVAL_S}",
                str(frames_dir / "frame_%04d.jpg"),
            ])
            for frame in sorted(frames_dir.glob("frame_*.jpg")):
                key = f"{job_prefix}/frames/{frame.name}"
                ctx.keyframe_keys.append(ctx.storage.save_file(key, str(frame)))

        log.info(
            "media_extraction: audio=%s keyframes=%d",
            bool(ctx.audio_key), len(ctx.keyframe_keys),
        )

    @staticmethod
    def _run_ffmpeg(cmd: list[str]) -> None:
        try:
            subprocess.run(cmd, check=True, capture_output=True)
        except subprocess.CalledProcessError as e:
            log.warning("ffmpeg command failed: %s", e.stderr.decode(errors="ignore")[:500])
