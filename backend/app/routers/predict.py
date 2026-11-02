"""Upload an audio file and classify its genre."""

from fastapi import APIRouter, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.dependencies import DB, CurrentUser, Model
from app.ml.myuzik import decode_clip
from app.schemas.prediction import PredictionResult
from app.services.predict_service import save_prediction

router = APIRouter(prefix="/predict", tags=["predict"])

MAX_FILE_SIZE = 50 * 1024 * 1024
ALLOWED_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/flac",
    "audio/x-flac",
    "audio/ogg",
}


def is_audio(head: bytes) -> bool:
    """Magic-byte sniff: ID3 / MPEG frame sync, RIFF-WAVE, FLAC, Ogg."""
    return (
        head.startswith((b"ID3", b"fLaC", b"OggS"))
        or (head[:4] == b"RIFF" and head[8:12] == b"WAVE")
        or (len(head) > 1 and head[0] == 0xFF and head[1] & 0xE0 == 0xE0)
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def predict(file: UploadFile, user: CurrentUser, model: Model, db: DB) -> PredictionResult:
    data = await file.read(MAX_FILE_SIZE + 1)
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "File exceeds 50 MB")
    if file.content_type not in ALLOWED_TYPES or not is_audio(data[:12]):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload an MP3, WAV, FLAC or OGG file")

    def classify() -> dict[str, float]:
        return model.classify(decode_clip(data))

    try:
        scores = await run_in_threadpool(classify)
    except (RuntimeError, ValueError) as e:  # LibsndfileError is a RuntimeError
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Could not decode audio") from e
    return await save_prediction(db, user.id, (file.filename or "upload")[:255], scores)
