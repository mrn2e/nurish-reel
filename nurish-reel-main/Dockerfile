# nurish-reel backend — FastAPI + the pipeline's native tools.
#
# The pipeline shells out to `ffmpeg` (audio + keyframe extraction) and uses
# Tesseract (on-screen-text OCR). Those are OS packages, not pip deps, so they
# must be installed in the image — otherwise media extraction no-ops and every
# transcript comes back as the stub.
FROM python:3.11-slim

# System deps:
#   ffmpeg    -> Stage 1 media extraction (audio.mp3 + keyframes)
#   tesseract -> Stage 3 OCR (pytesseract backend)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code.
COPY app ./app

# Local storage + SQLite live under ./data (ephemeral on Render's free tier —
# fine for a demo; see README "Deploy" notes).
RUN mkdir -p ./data/storage

# Render provides $PORT; default to 8000 for local `docker run`.
ENV PORT=8000
EXPOSE 8000

# Shell form so $PORT is expanded at runtime.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
