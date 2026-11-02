"""Query, delete and aggregate a user's predictions."""

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prediction import Prediction
from app.schemas.prediction import GenreShare, HistoryItem, SpotifyMatch, TasteProfile


def _to_item(p: Prediction) -> HistoryItem:
    match = (
        SpotifyMatch(
            track_name=p.spotify_track_name,
            artist=p.spotify_artist or "",
            album=p.spotify_album or "",
            album_art_url=p.spotify_album_art_url or "",
        )
        if p.spotify_track_name
        else None
    )
    return HistoryItem(
        id=p.id,
        filename=p.filename,
        genre=p.genre,
        confidence=p.confidence,
        spotify_match=match,
        created_at=p.created_at,
    )


async def get_history(
    db: AsyncSession, user_id: uuid.UUID, genre: str | None, limit: int, offset: int
) -> tuple[list[HistoryItem], int]:
    where = [Prediction.user_id == user_id] + ([Prediction.genre == genre] if genre else [])
    total = await db.scalar(select(func.count()).select_from(Prediction).where(*where))
    rows = await db.scalars(
        select(Prediction).where(*where).order_by(Prediction.created_at.desc()).offset(offset).limit(limit)
    )
    return [_to_item(p) for p in rows], total or 0


async def delete_prediction(db: AsyncSession, user_id: uuid.UUID, prediction_id: uuid.UUID) -> bool:
    result = await db.execute(delete(Prediction).where(Prediction.id == prediction_id, Prediction.user_id == user_id))
    await db.commit()
    return result.rowcount > 0


async def get_taste_profile(db: AsyncSession, user_id: uuid.UUID) -> TasteProfile:
    count = func.count().label("count")
    rows = (
        await db.execute(
            select(Prediction.genre, count)
            .where(Prediction.user_id == user_id)
            .group_by(Prediction.genre)
            .order_by(count.desc())
        )
    ).all()
    total = sum(r.count for r in rows)
    return TasteProfile(
        total_analyses=total,
        top_genre=rows[0].genre if rows else None,
        genre_breakdown=[
            GenreShare(genre=r.genre, count=r.count, percentage=round(r.count / total * 100, 1)) for r in rows
        ],
    )
