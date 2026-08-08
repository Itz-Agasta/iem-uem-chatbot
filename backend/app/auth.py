"""
Admin authentication: accounts live in Postgres (see models.AdminUser) with
bcrypt-hashed passwords, JWT issued on successful login. Multiple admin
accounts are supported (create more with manage_admin.py) -- this isn't
limited to a single hardcoded user anymore.
"""
import bcrypt
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from . import config
from .db import get_db
from .models import AdminUser

security = HTTPBearer()


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def hash_password(plain_password: str) -> str:
    # bcrypt has a 72-byte input limit -- truncate defensively rather than
    # erroring on unusually long passwords.
    password_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))
    except ValueError:
        return False


def authenticate(db: Session, username: str, password: str) -> AdminUser | None:
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=config.JWT_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> str:
    """FastAPI dependency: protects a route. Verifies the JWT signature/expiry
    AND that the account still exists in the DB (so a deleted admin's old
    tokens stop working immediately rather than staying valid until expiry).
    Returns the username if valid, otherwise raises 401."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
        username = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    if not username or not db.query(AdminUser).filter(AdminUser.username == username).first():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return username
