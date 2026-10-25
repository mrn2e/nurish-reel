"""FastAPI application entrypoint for nurish-reel.

Run locally:  uvicorn app.main:app --reload
Interactive docs:  http://localhost:8000/docs
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_videos import router as videos_router
from app.config import get_settings
from app.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="nurish-reel",
        version="0.1.0",
        description="Turn cooking videos into structured recipes, nutrition, and shopping lists.",
        lifespan=lifespan,
    )

    # CORS.
    #  - dev: allow any origin (no credentials, so "*" is valid).
    #  - prod: allow only the origins listed in CORS_ORIGINS (e.g. your Vercel
    #    domain). If none are configured, fall back to "*" so the demo still
    #    works out of the box.
    #  NOTE: the CORS spec forbids allow_credentials=True together with "*";
    #  this backend uses Bearer tokens, not cookies, so credentials stay off.
    if settings.is_dev or not settings.cors_origin_list:
        allow_origins = ["*"]
    else:
        allow_origins = settings.cors_origin_list

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(videos_router)

    @app.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "env": settings.app_env}

    return app


app = create_app()
