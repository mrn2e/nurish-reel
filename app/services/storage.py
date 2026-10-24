"""Object-storage abstraction.

A single `Storage` interface with two implementations:
  - `LocalStorage`  writes under a directory on disk (default dev backend).
  - `S3Storage`     talks to any S3-compatible endpoint (AWS S3, MinIO).

Pipeline code only ever depends on the interface, so switching backends is a
config change (STORAGE_BACKEND) with no code edits.
"""
from __future__ import annotations

import os
import shutil
from abc import ABC, abstractmethod
from pathlib import Path

from app.config import Settings


class Storage(ABC):
    @abstractmethod
    def save_bytes(self, key: str, data: bytes) -> str:
        """Persist raw bytes under `key`. Returns the stored key."""

    @abstractmethod
    def save_file(self, key: str, src_path: str) -> str:
        """Persist a file from local disk under `key`. Returns the stored key."""

    @abstractmethod
    def load_bytes(self, key: str) -> bytes:
        """Read the object stored at `key`."""

    @abstractmethod
    def local_path(self, key: str) -> str:
        """Return a readable local filesystem path for `key`.

        Pipeline tools like ffmpeg need a real path; for remote backends this
        downloads to a temp location and returns that path.
        """


class LocalStorage(Storage):
    def __init__(self, base_dir: str) -> None:
        self.base = Path(base_dir)
        self.base.mkdir(parents=True, exist_ok=True)

    def _full(self, key: str) -> Path:
        p = self.base / key
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def save_bytes(self, key: str, data: bytes) -> str:
        self._full(key).write_bytes(data)
        return key

    def save_file(self, key: str, src_path: str) -> str:
        dest = self._full(key)
        shutil.copyfile(src_path, dest)
        return key

    def load_bytes(self, key: str) -> bytes:
        return self._full(key).read_bytes()

    def local_path(self, key: str) -> str:
        return str(self._full(key))


class S3Storage(Storage):
    def __init__(self, settings: Settings) -> None:
        import boto3  # imported lazily so local dev needn't install/configure it

        self.bucket = settings.s3_bucket
        self._tmp = Path("./data/_s3cache")
        self._tmp.mkdir(parents=True, exist_ok=True)
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url or None,
            region_name=settings.s3_region or None,
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )

    def save_bytes(self, key: str, data: bytes) -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data)
        return key

    def save_file(self, key: str, src_path: str) -> str:
        self.client.upload_file(src_path, self.bucket, key)
        return key

    def load_bytes(self, key: str) -> bytes:
        obj = self.client.get_object(Bucket=self.bucket, Key=key)
        return obj["Body"].read()

    def local_path(self, key: str) -> str:
        dest = self._tmp / key.replace("/", "_")
        if not dest.exists():
            self.client.download_file(self.bucket, key, str(dest))
        return str(dest)


def build_storage(settings: Settings) -> Storage:
    if settings.storage_backend.lower() == "s3":
        return S3Storage(settings)
    return LocalStorage(settings.storage_local_dir)
