"""Test harness: in-memory SQLite, a fake genre model, and an authenticated client factory."""

import io
import os

os.environ.update(
    DATABASE_URL="sqlite+aiosqlite:///:memory:",
    JWT_SECRET="test-secret-test-secret-test-secret",
    FRONTEND_URL="http://localhost:3000",
    SPOTIFY_CLIENT_ID="",
)

import numpy as np  # noqa: E402
import pytest  # noqa: E402
import soundfile as sf  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


class FakeModel:
    labels = ["blues", "jazz", "rock"]

    def classify(self, waveform: np.ndarray) -> dict[str, float]:
        assert waveform.ndim == 1
        return {"blues": 0.1, "jazz": 0.7, "rock": 0.2}


@pytest.fixture(autouse=True)
async def db_schema():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    app.state.model = FakeModel()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def register(client: AsyncClient):
    async def _register(email: str = "ada@example.com") -> dict[str, str]:
        r = await client.post("/api/v1/auth/register", json={"name": "Ada", "email": email, "password": "password123"})
        assert r.status_code == 201, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return _register


@pytest.fixture
def wav_bytes() -> bytes:
    buf = io.BytesIO()
    sf.write(buf, np.zeros(16_000, dtype=np.float32), 16_000, format="WAV")
    return buf.getvalue()
