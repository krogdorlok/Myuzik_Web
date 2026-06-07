from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.prediction import Prediction
from app.models.user import User
from app.schemas.prediction import HistoryResponse, PredictionResult
from app.services.history_service import delete_prediction, get_history

router = APIRouter(prefix="/history", tags=["history"])


@router.post("", response_model=PredictionResult, status_code=status.HTTP_201_CREATED)
async def save_to_history(
    data: PredictionResult,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    # Check if prediction already exists
    existing = await db.execute(
        select(Prediction).where(Prediction.id == data.prediction_id)
    )
    if existing.scalar_one_or_none():
        return data

    # Already saved by predict endpoint, return as-is
    return data


@router.get("", response_model=HistoryResponse)
async def get_user_history(
    genre: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    items, total = await get_history(current_user.id, genre, limit, offset, db)
    return HistoryResponse(items=items, total=total)


@router.delete("/{prediction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history_item(
    prediction_id: str,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    deleted = await delete_prediction(prediction_id, current_user.id, db)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Prediction not found or access denied",
        )
