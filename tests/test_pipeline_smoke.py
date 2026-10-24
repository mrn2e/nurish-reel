"""Smoke tests: the app boots and the pipeline runs end-to-end in stub mode.

These require no API keys and no ffmpeg/tesseract binaries — they verify the
scaffold is wired together correctly.
"""
from __future__ import annotations

import io

from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app


def setup_module() -> None:
    init_db()


def test_health() -> None:
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_upload_and_process_stub() -> None:
    client = TestClient(app)

    # Upload a tiny dummy "video" plus an SRT caption track.
    srt = b"1\n00:00:01,000 --> 00:00:03,000\nAdd two cups of flour\n"
    resp = client.post(
        "/api/videos",
        files={
            "video": ("clip.mp4", io.BytesIO(b"not-a-real-video"), "video/mp4"),
            "captions": ("clip.srt", io.BytesIO(srt), "text/plain"),
        },
    )
    assert resp.status_code == 202, resp.text
    job_id = resp.json()["job_id"]

    # TestClient runs BackgroundTasks synchronously, so it's done by now.
    status_resp = client.get(f"/api/videos/{job_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "completed", status_resp.text

    result = client.get(f"/api/videos/{job_id}/result")
    assert result.status_code == 200
    body = result.json()
    assert "recipe" in body
    assert "shopping_list" in body
    # The caption text should have flowed into the transcript evidence / stub.
    assert body["recipe"]["title"]
