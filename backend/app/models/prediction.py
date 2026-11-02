"""A stored genre prediction with its full score distribution and optional Spotify match."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    genre: Mapped[str] = mapped_column(String(32))
    confidence: Mapped[float]
    all_scores: Mapped[dict[str, float]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    spotify_track_name: Mapped[str | None] = mapped_column(String(255))
    spotify_artist: Mapped[str | None] = mapped_column(String(255))
    spotify_album: Mapped[str | None] = mapped_column(String(255))
    spotify_album_art_url: Mapped[str | None] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
