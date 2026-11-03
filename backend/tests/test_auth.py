"""Auth endpoints."""

from httpx import AsyncClient

USER = {"name": "Ada", "email": "Ada@Example.com", "password": "password123"}


async def test_register_returns_token_and_normalized_email(client: AsyncClient):
    r = await client.post("/api/v1/auth/register", json=USER)
    assert r.status_code == 201
    assert r.json()["user"]["email"] == "ada@example.com"
    assert r.json()["access_token"]


async def test_register_duplicate_email(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=USER)
    r = await client.post("/api/v1/auth/register", json={**USER, "email": "ada@example.com"})
    assert r.status_code == 409


async def test_register_rejects_short_and_overlong_passwords(client: AsyncClient):
    assert (await client.post("/api/v1/auth/register", json={**USER, "password": "short"})).status_code == 422
    assert (await client.post("/api/v1/auth/register", json={**USER, "password": "é" * 40})).status_code == 422


async def test_login(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=USER)
    ok = await client.post("/api/v1/auth/login", json={"email": "ada@example.com", "password": "password123"})
    bad = await client.post("/api/v1/auth/login", json={"email": "ada@example.com", "password": "wrong-pass"})
    unknown = await client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "password123"})
    assert ok.status_code == 200 and ok.json()["access_token"]
    assert bad.status_code == unknown.status_code == 401
    assert bad.json() == unknown.json()
    overlong = await client.post(
        "/api/v1/auth/login", json={"email": "ada@example.com", "password": "password123" + "x" * 70}
    )
    assert overlong.status_code == 422


async def test_me(client: AsyncClient, register):
    headers = await register()
    assert (await client.get("/api/v1/auth/me", headers=headers)).json()["email"] == "ada@example.com"
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    assert (await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer nope"})).status_code == 401


def test_plain_postgres_urls_use_asyncpg():
    from app.config import Settings

    base = {"jwt_secret": "x" * 32, "frontend_url": "http://x"}
    for url in ("postgres://u:p@h:5432/db", "postgresql://u:p@h:5432/db"):
        assert Settings(database_url=url, **base).database_url == "postgresql+asyncpg://u:p@h:5432/db"
