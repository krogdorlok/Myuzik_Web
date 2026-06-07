import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass

GENRES = [
    "blues",
    "classical",
    "country",
    "disco",
    "hiphop",
    "jazz",
    "metal",
    "pop",
    "reggae",
    "rock",
]


def run_prediction(audio_path: str, model_path: str) -> dict:
    """
    Run genre prediction on an audio file.

    NOTE: This requires the existing Myuzik model to be present.
    Import the actual predict_genre function when available:

        from scripts.predict_genre import predict_genre
        genre, confidence, all_scores = predict_genre(audio_path, model_path)

    For now, returns a placeholder result.
    """
    try:
        # TODO: Import and use actual predict_genre when model is available
        # from scripts.predict_genre import predict_genre as _predict_genre
        # genre, confidence, all_scores = _predict_genre(audio_path, model_path)

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}")

        # Placeholder - replace with actual prediction
        import random
        genre = random.choice(GENRES)
        confidence = round(random.uniform(0.7, 0.99), 3)
        all_scores = {g: round(random.uniform(0.0, 0.3), 3) for g in GENRES}
        all_scores[genre] = confidence

        return {
            "genre": genre,
            "confidence": confidence,
            "all_scores": all_scores,
        }
    except Exception as e:
        raise RuntimeError(f"Prediction failed: {e}")
