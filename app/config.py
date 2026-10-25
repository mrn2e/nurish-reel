"""Application settings, loaded from environment variables / .env.

Every provider key is optional. When a key is missing the corresponding
pipeline stage falls back to a deterministic stub, so the whole app runs
end-to-end with zero configuration — useful for local development and CI.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_env: str = "dev"
    log_level: str = "INFO"

    # CORS — comma-separated list of allowed frontend origins (prod).
    # In dev, all origins are allowed regardless of this value.
    # Example: "https://my-app.vercel.app,https://www.my-app.com"
    cors_origins: str = ""

    # Database
    database_url: str = "sqlite:///./data/nurish.sqlite3"

    # Object storage
    storage_backend: str = "local"  # local | s3
    storage_local_dir: str = "./data/storage"
    s3_bucket: str = ""
    s3_endpoint_url: str = ""
    s3_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # Transcription + LLM structuring (both use Gemini, one key).
    #
    # Two separate model settings so each call uses the right model and draws
    # from its own per-model quota:
    #   - gemini_transcription_model: audio -> text (Stage 2). Defaults to the
    #     dedicated ASR model gemini-3.5-transcribe.
    #   - gemini_model: structure text -> recipe JSON (Stage 5). A general Flash
    #     model. Use a floating "-latest" alias so it keeps resolving to a
    #     current model — pinned names get retired (gemini-1.5-*) or blocked for
    #     new accounts (gemini-2.5-flash -> "no longer available to new users"),
    #     both of which 404. Override via GEMINI_MODEL for a specific pin.
    #
    # If gemini_transcription_model is blank, transcription falls back to
    # gemini_model, so a single GEMINI_MODEL still works.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    gemini_transcription_model: str = "gemini-3.5-transcribe"

    # Nutrition (USDA FoodData Central)
    usda_api_key: str = ""

    # Auth0
    auth0_domain: str = ""
    auth0_audience: str = ""

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() == "dev"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parsed, de-whitespaced list of allowed CORS origins."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def auth_enabled(self) -> bool:
        """Real Auth0 validation runs only when fully configured."""
        return bool(self.auth0_domain and self.auth0_audience)


@lru_cache
def get_settings() -> Settings:
    return Settings()
