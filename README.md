# nurish-reel

Turn cooking videos into **structured recipes**, **nutrition facts**, and a **shopping list**.

Upload a video (optionally with a subtitle track); the backend extracts media,
transcribes speech, reads on-screen text, structures it into a recipe with an
LLM, enriches it with nutrition data, and generates a shopping list — then
serves the result to a frontend.

> **Status:** FastAPI backend scaffold. Every external provider is optional — the
> app runs end-to-end with **zero API keys** by falling back to deterministic
> stubs, so you can develop and test the full flow before wiring up credentials.

## Architecture

```
┌──────────┐   upload    ┌───────────────┐   enqueue   ┌───────────────────────┐
│ Frontend │ ──────────► │ API (FastAPI) │ ──────────► │  Processing pipeline  │
└──────────┘             └───────────────┘             │  (background worker)  │
     ▲  poll job status         │                      │ 1. media extraction   │
     │                          ▼                      │ 2. transcription      │
     └───────── result ─ DB + object storage ◄─────────│ 3. OCR                │
                                                       │ 4. captions           │
                                                       │ 5. LLM structuring    │
                                                       │ 6. nutrition (USDA)   │
                                                       │ 7. shopping list      │
                                                       └───────────────────────┘
```

Processing is **asynchronous**: upload returns a `job_id` immediately and the
pipeline runs in the background. The frontend polls job status, then fetches the
result when the job is `completed`.

### Pipeline stages

| # | Stage | Provider | Fallback without a key/binary |
|---|-------|----------|-------------------------------|
| 1 | Media extraction | `ffmpeg` (audio + keyframes) | skips; downstream stages adapt |
| 2 | Transcription | Hosted Whisper (OpenAI) | stub transcript |
| 3 | OCR | Tesseract (`pytesseract`) | no-op |
| 4 | Captions | SRT/VTT subtitle parser | skips if no track uploaded |
| 5 | Structuring | Gemini → JSON | deterministic stub recipe |
| 6 | Nutrition | USDA FoodData Central | ingredients keep `nutrition=null` |
| 7 | Shopping list | in-process aggregation | always runs |

Each stage is a self-contained class implementing the `Stage` protocol
(`app/pipeline/base.py`) and communicates only through a shared
`PipelineContext`. Swap, reorder, or replace any stage by editing the `STAGES`
list in `app/pipeline/orchestrator.py` — nothing else needs to change.

## Project layout

```
app/
  main.py                 FastAPI entrypoint (create_app, /health)
  config.py               Settings from env vars (.env)
  db.py                   SQLAlchemy engine + jobs table
  models/
    recipe.py             Recipe, Ingredient, Step, Nutrition, ShoppingList
    job.py                Job + JobStatus
  api/
    routes_videos.py      upload / status / result endpoints
    deps.py               auth dependency (Auth0, dev stub)
  services/
    storage.py            Storage interface + Local / S3 backends
    jobstore.py           job persistence
  pipeline/
    base.py               Stage protocol + PipelineContext
    orchestrator.py       runs stages, updates job state
    media_extraction.py   ocr.py  captions.py  transcription.py
    structuring.py        nutrition.py  shopping_list.py
tests/
  test_pipeline_smoke.py  end-to-end stub-mode test (no keys needed)
```

## Quickstart

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # optional — runs in stub mode without it
uvicorn app.main:app --reload
```

Open the interactive API docs at <http://localhost:8000/docs>.

### Try it

```bash
# Upload a video (+ optional subtitle track). Returns a job_id.
curl -s -F "video=@clip.mp4" -F "captions=@clip.srt" \
     http://localhost:8000/api/videos

# Poll status
curl -s http://localhost:8000/api/videos/<job_id>

# Fetch the structured result once status == "completed"
curl -s http://localhost:8000/api/videos/<job_id>/result
```

### Run tests

```bash
pytest
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/videos` | Upload video (+ optional `captions` file). Returns `job_id`, `202`. |
| `GET`  | `/api/videos/{job_id}` | Job status + current stage. |
| `GET`  | `/api/videos/{job_id}/result` | `RecipeResult` once completed (`409` if not ready). |
| `GET`  | `/health` | Liveness probe. |

## Configuration

All settings come from environment variables (see `.env.example`). Keys are
optional; absent keys activate the stub fallbacks above.

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Hosted Whisper transcription |
| `GEMINI_API_KEY` | Recipe structuring (JSON output) |
| `USDA_API_KEY` | Nutrition lookup ([sign up](https://fdc.nal.usda.gov/api-key-signup.html)) |
| `DATABASE_URL` | SQLite (default) or Postgres |
| `STORAGE_BACKEND` | `local` (default) or `s3` (+ `S3_*` vars; works with MinIO) |
| `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` | Enable Auth0 JWT validation (dev stub user when unset) |

## Production notes (swap points)

The scaffold uses light defaults that are deliberately easy to replace:

- **Worker:** `BackgroundTasks` is the dev worker. Replace the
  `background_tasks.add_task(run_pipeline, ...)` call with a Celery/RQ enqueue
  for durable, distributed processing.
- **Database:** point `DATABASE_URL` at Postgres.
- **Storage:** set `STORAGE_BACKEND=s3` with the `S3_*` settings (AWS S3 or MinIO).
- **Auth:** set the `AUTH0_*` variables; add `python-jose[cryptography]` to
  `requirements.txt` to activate the JWT-validation path in `app/api/deps.py`.
```
