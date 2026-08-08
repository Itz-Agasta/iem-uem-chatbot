"""
Database models. Just one table for now -- admin accounts for the kiosk's
back office (event banner, tickers, knowledge-base re-indexing).
"""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from .db import Base


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
