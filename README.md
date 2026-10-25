https://nurish-reel-qqrcu79ib-rp-4135.vercel.app/




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
| 2 | Transcription | Gemini (audio → text) | stub transcript |
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
| `GEMINI_API_KEY` | Audio transcription **and** recipe structuring (JSON output) |
| `GEMINI_MODEL` | Gemini model name (default `gemini-flash-latest`; pinned `gemini-1.5-*` names are retired and 404) |
| `USDA_API_KEY` | Nutrition lookup ([sign up](https://fdc.nal.usda.gov/api-key-signup.html)) |
| `CORS_ORIGINS` | Comma-separated frontend origins allowed in prod (ignored in dev) |
| `DATABASE_URL` | SQLite (default) or Postgres |
| `STORAGE_BACKEND` | `local` (default) or `s3` (+ `S3_*` vars; works with MinIO) |
| `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` | Enable Auth0 JWT validation (dev stub user when unset) |

## Deploy (Vercel frontend + Render backend)

The app is two pieces: a **static frontend** (Vercel) and the **FastAPI
backend** (Render). They must be deployed separately — Vercel's serverless
runtime cannot run `ffmpeg` or the background pipeline, so the backend lives on
a container host. The pieces connect by pointing the frontend at the backend's
URL.

> **Why not Vercel for the backend?** The pipeline shells out to `ffmpeg` for
> audio/keyframe extraction. Without it, Stage 1 no-ops, no audio is produced,
> and every transcript comes back as the stub — which is exactly the symptom of
> a frontend talking to a backend (or non-backend) that lacks `ffmpeg`.

### 1. Backend → Render

This repo ships a `Dockerfile` (installs `ffmpeg` + `tesseract`) and a
`render.yaml` Blueprint.

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, select the repo. Render reads `render.yaml`
   and creates a free **Docker** web service.
3. Set the secret env vars when prompted (marked `sync:false`):
   - `GEMINI_API_KEY` — your Gemini key (powers transcription **and** structuring)
   - `USDA_API_KEY` — your USDA key
   - `CORS_ORIGINS` — your Vercel URL, e.g. `https://nurish-reel.vercel.app`
     (leave blank to allow all origins — simplest for a demo)
4. Deploy. When it's live, open `https://<service>.onrender.com/health` — it
   should return `{"status":"ok","env":"prod"}`.

> Render's **free plan sleeps after ~15 min idle** and cold-starts on the next
> request (a few seconds). Fine for a hackathon demo.

### 2. Point the frontend at the backend

The frontend's API base defaults to `http://localhost:8000`. Override it with
the deployed backend URL in **one** of these ways:

- In the running app's profile/settings sheet, set the API field (persists to
  `localStorage["nurish.api"]`), **or**
- In the browser console on your Vercel site:
  ```js
  localStorage.setItem('nurish.api', 'https://<service>.onrender.com');
  location.reload();
  ```
- Or hard-code a default in `frontend/index.html` before `api.js` loads:
  ```html
  <script>window.NURISH_API = 'https://<service>.onrender.com';</script>
  ```

### Common gotcha: "stub transcript" output

If uploads return *"Gemini transcription was not run…"*, check in order:
1. The frontend is pointed at the real backend (`localStorage["nurish.api"]`),
   not the `localhost:8000` default.
2. `GEMINI_API_KEY` is set **on the backend** (Render), not only on Vercel —
   Vercel env vars are invisible to the Render backend.
3. The backend image has `ffmpeg` (the provided `Dockerfile` installs it). No
   ffmpeg → no audio → stub, even with a valid key.
4. If the stub message includes `(error: 404 models/... is not found)`, the
   `GEMINI_MODEL` is retired. Use `gemini-flash-latest` (the default), or list
   what your key supports:
   ```bash
   curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY" \
     | grep -o '"name": "models/[^"]*"'
   ```

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
