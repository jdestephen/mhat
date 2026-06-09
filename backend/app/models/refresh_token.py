"""Refresh token model for secure session management."""
import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional
from uuid import UUID

from app.db.base_class import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    device_info: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    @property
    def is_valid(self) -> bool:
        """Check if token is still valid (not revoked, not expired)."""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        return self.revoked_at is None and self.expires_at > now
