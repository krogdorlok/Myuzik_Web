"""Register, login and current-user endpoints."""

from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.dependencies import DB, CurrentUser
from app.models.user import User
from app.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse
from app.services.auth_service import create_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _session(user: User) -> TokenResponse:
    return TokenResponse(access_token=create_token(user.id), user=UserResponse.model_validate(user))


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: DB) -> TokenResponse:
    hashed = await run_in_threadpool(hash_password, data.password)
    user = User(name=data.name, email=data.email, hashed_password=hashed)
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered") from None
    return _session(user)


@router.post("/login")
async def login(data: UserLogin, db: DB) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == data.email))
    if not await run_in_threadpool(verify_password, data.password, user.hashed_password if user else None):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return _session(user)


@router.get("/me")
async def me(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)
