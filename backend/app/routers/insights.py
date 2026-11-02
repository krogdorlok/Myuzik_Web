"""Aggregate listening insights."""

from fastapi import APIRouter

from app.dependencies import DB, CurrentUser
from app.schemas.prediction import TasteProfile
from app.services.history_service import get_taste_profile

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/taste-profile")
async def taste_profile(user: CurrentUser, db: DB) -> TasteProfile:
    return await get_taste_profile(db, user.id)
