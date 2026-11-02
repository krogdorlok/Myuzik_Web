"""Persist a prediction together with its best-effort Spotify match."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.myuzik import top_genre
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionResult
from app.services.spotify_service import spotify


async def save_prediction(
    db: AsyncSession, user_id: uuid.UUID, filename: str, scores: dict[str, float]
) -> PredictionResult:
    genre, confidence = top_genre(scores)
    match = await spotify.search_track(filename)
    prediction = Prediction(
        user_id=user_id,
        filename=filename,
        genre=genre,
        confidence=confidence,
        all_scores=scores,
        **{f"spotify_{k}": v for k, v in (match.model_dump() if match else {}).items()},
    )
    db.add(prediction)
    await db.commit()
    return PredictionResult(
        prediction_id=prediction.id, genre=genre, confidence=confidence, all_scores=scores, spotify_match=match
    )
