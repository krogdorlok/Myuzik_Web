"""Shared FastAPI dependencies: DB session, current user, loaded model."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.ml.myuzik import GenreModel
from app.models.user import User
from app.services.auth_service import decode_token

DB = Annotated[AsyncSession, Depends(get_db)]
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    db: DB, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]
) -> User:
    user_id = decode_token(credentials.credentials) if credentials else None
    user = await db.get(User, user_id) if user_id else None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


def get_model(request: Request) -> GenreModel:
    return request.app.state.model


CurrentUser = Annotated[User, Depends(get_current_user)]
Model = Annotated[GenreModel, Depends(get_model)]
