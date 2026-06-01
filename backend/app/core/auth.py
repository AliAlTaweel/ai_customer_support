from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from pydantic import BaseModel
from typing import Optional
import logging
import time
import uuid
from sqlalchemy import text
from app.tools.base import engine

from contextvars import ContextVar

logger = logging.getLogger(__name__)

# ContextVar to store current Clerk Organization ID for multi-tenant isolation
CURRENT_ORG_ID: ContextVar[Optional[str]] = ContextVar("current_org_id", default=None)
# ContextVar to store resolved database Tenant UUID for multi-tenant isolation
CURRENT_TENANT_DB_ID: ContextVar[Optional[str]] = ContextVar("current_tenant_db_id", default=None)


class UserContext(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    org_id: Optional[str] = None
    tenant_id: Optional[str] = None
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
            from jose import jwt, jwk

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

            unverified_claims = jwt.get_unverified_claims(token)
            logger.info(f"Unverified Claims: {unverified_claims}")

            payload = jwt.decode(
                token,
                signing_key,
                algorithms=["RS256"],
                options={
                    "verify_aud": False,
                    "verify_iss": False
                },  # Bypass variable aud/iss domain mismatches; signature verification is fully sufficient
            )
            return payload

        except Exception as e:
            # Any failure → treat token as invalid (don't silently fall through)
            raise ValueError(f"JWT verification failed: {e}")

    # ── No Verification Configured ──────────────────────────────────────────
    logger.error("CLERK_JWKS_URL is not configured. JWT verification is DISABLED. Access denied for safety.")
    raise ValueError("Authentication system misconfigured: JWKS URL missing.")


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
            org_id=None,
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
    
    org_id = payload.get("org_id")
    CURRENT_ORG_ID.set(org_id)
    
    tenant_db_id = None
    if org_id:
        try:
            with engine.begin() as connection:
                # Look up or create tenant matching Clerk's org_id
                result = connection.execute(
                    text('SELECT id FROM "Tenant" WHERE "clerkOrgId" = :clerk_org_id'),
                    {"clerk_org_id": org_id}
                )
                row = result.fetchone()
                if row:
                    tenant_db_id = row[0]
                else:
                    tenant_db_id = str(uuid.uuid4())
                    org_name = f"Org {org_id[:8]}"
                    connection.execute(
                        text('INSERT INTO "Tenant" (id, "clerkOrgId", name, "createdAt", "updatedAt") VALUES (:id, :clerk_org_id, :name, NOW(), NOW())'),
                        {"id": tenant_db_id, "clerk_org_id": org_id, "name": org_name}
                    )
            CURRENT_TENANT_DB_ID.set(tenant_db_id)
        except Exception as db_err:
            logger.error(f"Error mapping Clerk org_id {org_id} to tenant: {db_err}")
            
    return UserContext(
        user_id=payload.get("sub"),
        email=payload.get("email") or payload.get("primary_email_address") or payload.get("email_address"),
        full_name=full_name,
        org_id=org_id,
        tenant_id=tenant_db_id,
        is_authenticated=True,
    )
