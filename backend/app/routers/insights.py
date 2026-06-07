from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.prediction import TasteProfile
from app.services.history_service import get_taste_profile

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/taste-profile", response_model=TasteProfile)
async def get_user_taste_profile(
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    return await get_taste_profile(current_user.id, db)
