
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.ml.myuzik import run_prediction
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionResult
from app.services.spotify_service import spotify_service


async def run_prediction_service(
    file_path: str,
    filename_hint: str,
    user_id: str,
    db: AsyncSession,
) -> PredictionResult:
    result = run_prediction(file_path, settings.model_path)

    spotify_match = await spotify_service.search_track(result["genre"], filename_hint)

    prediction = Prediction(
        user_id=user_id,
        filename=filename_hint,
        genre=result["genre"],
        confidence=result["confidence"],
        all_scores=result["all_scores"],
        spotify_track_name=spotify_match.track_name if spotify_match else None,
        spotify_artist=spotify_match.artist if spotify_match else None,
        spotify_album=spotify_match.album if spotify_match else None,
        spotify_album_art_url=spotify_match.album_art_url if spotify_match else None,
    )
    db.add(prediction)
    await db.commit()
    await db.refresh(prediction)

    return PredictionResult(
        prediction_id=prediction.id,
        genre=prediction.genre,
        confidence=prediction.confidence,
        all_scores=prediction.all_scores,
        spotify_match=spotify_match,
    )
