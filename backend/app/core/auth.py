from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from pydantic import BaseModel
from typing import Optional
import logging
import time

logger = logging.getLogger(__name__)


class UserContext(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_authenticated: bool = False


security = HTTPBearer(auto_error=False)

# ── JWKS Cache ────────────────────────────────────────────────────────────────
_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}
_JWKS_CACHE_TTL = 3600  # seconds


def _get_jwks() -> Optional[dict]:
    """Fetch and cache Clerk's public JWKS. Returns None if URL not configured."""
    if not settings.CLERK_JWKS_URL:
        return None

    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < _JWKS_CACHE_TTL:
        return _jwks_cache["keys"]

    try:
        import httpx
        response = httpx.get(settings.CLERK_JWKS_URL, timeout=5.0)
        response.raise_for_status()
        jwks = response.json()
        _jwks_cache["keys"] = jwks
        _jwks_cache["fetched_at"] = now
        logger.info("JWKS fetched and cached successfully.")
        return jwks
    except Exception as e:
        logger.error(f"Failed to fetch JWKS from {settings.CLERK_JWKS_URL}: {e}")
        return None


def _verify_and_decode(token: str) -> dict:
    """
    Verify a Clerk JWT and return its payload.

    1. If CLERK_JWKS_URL is set → verify RS256 signature against Clerk's public keys.
    2. If not configured     → decode without verification (dev-mode fallback, logged as warning).

    Raises ValueError on invalid tokens so the caller can return 401.
    """
    jwks = _get_jwks()

    if jwks:
        # ── Verified path (production) ────────────────────────────────────────
        try:
            from jose import jwt, jwk, JWTError

            header = jwt.get_unverified_header(token)
            kid = header.get("kid")

            # Find the matching public key by key-id
            signing_key = None
            for key_data in jwks.get("keys", []):
                if key_data.get("kid") == kid:
                    signing_key = jwk.construct(key_data)
                    break

            if signing_key is None:
                raise ValueError(f"No matching JWK found for kid='{kid}'")

            payload = jwt.decode(
                token,
                signing_key,
                algorithms=["RS256"],
                options={"verify_aud": False},  # Clerk tokens may omit aud
                issuer=settings.CLERK_ISSUER if settings.CLERK_ISSUER else None,
            )
            return payload

        except Exception as e:
            # Any failure → treat token as invalid (don't silently fall through)
            raise ValueError(f"JWT verification failed: {e}")

    # ── Unverified fallback (dev mode only) ──────────────────────────────────
    logger.warning(
        "CLERK_JWKS_URL is not configured — JWT signature is NOT being verified. "
        "This is acceptable for local development only."
    )
    try:
        import base64
        import json

        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT structure (expected 3 parts)")

        payload_b64 = parts[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)  # re-pad
        payload_data = base64.b64decode(payload_b64).decode("utf-8")
        return json.loads(payload_data)
    except Exception as e:
        raise ValueError(f"Could not decode JWT payload: {e}")


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserContext:
    """
    FastAPI dependency that resolves the current user from a Clerk Bearer token.

    - No token  → Guest UserContext (is_authenticated=False)
    - Valid token → Authenticated UserContext
    - Invalid token → HTTP 401
    """
    if not auth or auth.credentials in ("null", "undefined", ""):
        return UserContext(
            user_id=None,
            email=None,
            full_name="Guest",
            is_authenticated=False,
        )

    token = auth.credentials

    try:
        payload = _verify_and_decode(token)
    except ValueError as e:
        logger.warning(f"Auth rejection: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Clerk stores user ID in "sub"; name may come from various fields
    first = payload.get("first_name", "")
    last = payload.get("last_name", "")
    full_name = (
        payload.get("name")
        or f"{first} {last}".strip()
        or None
    )

    # Debug: log payload to see if sub is present
    logger.debug(f"Auth Payload: {payload}")
    
    return UserContext(
        user_id=payload.get("sub"),
        email=payload.get("email") or payload.get("primary_email_address"),
        full_name=full_name,
        is_authenticated=True,
    )
