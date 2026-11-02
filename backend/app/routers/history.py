"""List and delete the current user's predictions."""

import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.dependencies import DB, CurrentUser
from app.schemas.prediction import HistoryResponse
from app.services.history_service import delete_prediction, get_history

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
async def list_history(
    user: CurrentUser,
    db: DB,
    genre: str | None = Query(None, max_length=32),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> HistoryResponse:
    items, total = await get_history(db, user.id, genre, limit, offset)
    return HistoryResponse(items=items, total=total)


@router.delete("/{prediction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history_item(prediction_id: uuid.UUID, user: CurrentUser, db: DB) -> None:
    # 404 for both "missing" and "someone else's" so IDs can't be probed.
    if not await delete_prediction(db, user.id, prediction_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prediction not found")
