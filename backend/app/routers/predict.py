from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.prediction import PredictionResult
from app.services.predict_service import run_prediction_service

router = APIRouter(prefix="/predict", tags=["predict"])

ALLOWED_MIME_TYPES = {
    "audio/mpeg",
    "audio/wav",
    "audio/flac",
    "audio/ogg",
    "audio/x-flac",
    "audio/x-wav",
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("", response_model=PredictionResult, status_code=status.HTTP_201_CREATED)
async def predict(
    file: UploadFile,
    filename_hint: str | None = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB",
        )

    import os
    import tempfile

    filename = filename_hint or file.filename

    with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = await run_prediction_service(tmp_path, filename, current_user.id, db)
        return result
    finally:
        os.unlink(tmp_path)
