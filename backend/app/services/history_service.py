from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prediction import Prediction
from app.schemas.prediction import HistoryItem, TasteProfile


async def get_history(
    user_id: str,
    genre: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession | None = None,
) -> tuple[list[HistoryItem], int]:
    query = select(Prediction).where(Prediction.user_id == user_id)

    if genre:
        query = query.where(Prediction.genre == genre)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    query = query.order_by(desc(Prediction.created_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    predictions = result.scalars().all()

    items = [
        HistoryItem(
            id=p.id,
            filename=p.filename,
            genre=p.genre,
            confidence=p.confidence,
            spotify_match=(
                {
                    "track_name": p.spotify_track_name,
                    "artist": p.spotify_artist,
                    "album": p.spotify_album,
                    "album_art_url": p.spotify_album_art_url,
                }
                if p.spotify_track_name
                else None
            ),
            created_at=p.created_at.isoformat(),
        )
        for p in predictions
    ]

    return items, total


async def delete_prediction(prediction_id: str, user_id: str, db: AsyncSession) -> bool:
    result = await db.execute(
        delete(Prediction).where(
            Prediction.id == prediction_id,
            Prediction.user_id == user_id,
        )
    )
    await db.commit()
    return result.rowcount > 0


async def get_taste_profile(user_id: str, db: AsyncSession) -> TasteProfile:
    query = (
        select(
            Prediction.genre,
            func.count().label("count"),
        )
        .where(Prediction.user_id == user_id)
        .group_by(Prediction.genre)
        .order_by(desc("count"))
    )

    result = await db.execute(query)
    rows = result.all()

    total = sum(row.count for row in rows)
    top_genre = rows[0].genre if rows else "Unknown"

    genre_breakdown = [
        {
            "genre": row.genre,
            "count": row.count,
            "percentage": round((row.count / total * 100), 2) if total else 0,
        }
        for row in rows
    ]

    return TasteProfile(
        total_analyses=total,
        top_genre=top_genre,
        genre_breakdown=genre_breakdown,
    )
