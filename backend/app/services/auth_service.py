"""Password hashing (bcrypt) and stateless JWT sessions."""

import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.config import settings

# Login compares against this when the email is unknown, so response time doesn't reveal which emails exist.
_DUMMY_HASH = bcrypt.hashpw(b"timing-equalizer", bcrypt.gensalt()).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str | None) -> bool:
    ok = bcrypt.checkpw(password.encode()[:72], (hashed or _DUMMY_HASH).encode())
    return ok and hashed is not None


def create_token(user_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(days=settings.jwt_expire_days)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> uuid.UUID | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], options={"require": ["exp", "sub"]})
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError):
        return None
