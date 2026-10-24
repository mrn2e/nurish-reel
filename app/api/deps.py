"""Request dependencies — primarily authentication.

In dev (no AUTH0_DOMAIN/AUTH0_AUDIENCE configured) `get_current_user` returns a
fixed dev user so the API is usable without an identity provider. When Auth0 is
configured, it validates the incoming Bearer JWT against the tenant's JWKS and
returns the `sub` claim as the user id.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Header, HTTPException, status

from app.config import Settings, get_settings

DEV_USER_ID = "dev-user"


@dataclass
class CurrentUser:
    id: str


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if not settings.auth_enabled:
        return CurrentUser(id=DEV_USER_ID)

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    token = authorization.split(" ", 1)[1]
    sub = _validate_auth0_token(token, settings)
    return CurrentUser(id=sub)


def _validate_auth0_token(token: str, settings: Settings) -> str:
    """Validate an Auth0 RS256 JWT against the tenant JWKS.

    NOTE: Scaffolded path. Requires `python-jose[cryptography]` at runtime; add
    it to requirements.txt when enabling Auth0. Kept out of the default deps so
    the dev path stays dependency-light.
    """
    try:
        import httpx
        from jose import jwt  # type: ignore
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Auth0 validation deps not installed: {e}",
        )

    domain = settings.auth0_domain.rstrip("/")
    jwks_url = f"https://{domain}/.well-known/jwks.json"
    issuer = f"https://{domain}/"
    try:
        jwks = httpx.get(jwks_url, timeout=10).json()
        header = jwt.get_unverified_header(token)
        key = next((k for k in jwks["keys"] if k["kid"] == header["kid"]), None)
        if key is None:
            raise ValueError("signing key not found in JWKS")
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=issuer,
        )
        return claims["sub"]
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
        )
