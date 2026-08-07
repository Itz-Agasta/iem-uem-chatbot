"""
Minimal admin auth: one hardcoded admin account (configured via env vars,
see config.py), issuing a short-lived JWT on login. Protected routes require
a valid bearer token. This is intentionally simple -- there's exactly one
admin account, not a full user system -- appropriate for a single kiosk's
back office, not a multi-tenant product.
"""
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from . import config

security = HTTPBearer()


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def authenticate(username: str, password: str) -> bool:
    # Plain comparison is fine here: single hardcoded admin credential pair,
    # not a multi-user password database. Set real values via env vars.
    return username == config.ADMIN_USERNAME and password == config.ADMIN_PASSWORD


def create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=config.JWT_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)


def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """FastAPI dependency: protects a route, returns the admin username if the
    bearer token is valid, otherwise raises 401."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
        username = payload.get("sub")
        if username != config.ADMIN_USERNAME:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
