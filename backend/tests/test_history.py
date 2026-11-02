"""History listing, filtering, ownership-checked delete, and taste profile."""

from httpx import AsyncClient


async def _upload(client: AsyncClient, headers: dict[str, str], wav: bytes) -> str:
    r = await client.post("/api/v1/predict", headers=headers, files={"file": ("a.wav", wav, "audio/wav")})
    return r.json()["prediction_id"]


async def test_history_filter_and_pagination(client: AsyncClient, register, wav_bytes: bytes):
    headers = await register()
    for _ in range(3):
        await _upload(client, headers, wav_bytes)
    page = (await client.get("/api/v1/history?limit=2&offset=0", headers=headers)).json()
    assert page["total"] == 3 and len(page["items"]) == 2
    assert (await client.get("/api/v1/history?genre=rock", headers=headers)).json()["total"] == 0


async def test_delete_is_owner_only(client: AsyncClient, register, wav_bytes: bytes):
    owner, other = await register("owner@example.com"), await register("other@example.com")
    pid = await _upload(client, owner, wav_bytes)
    assert (await client.delete(f"/api/v1/history/{pid}", headers=other)).status_code == 404
    assert (await client.delete(f"/api/v1/history/{pid}", headers=owner)).status_code == 204
    assert (await client.delete(f"/api/v1/history/{pid}", headers=owner)).status_code == 404
    assert (await client.delete("/api/v1/history/not-a-uuid", headers=owner)).status_code == 422


async def test_taste_profile(client: AsyncClient, register, wav_bytes: bytes):
    headers = await register()
    empty = (await client.get("/api/v1/insights/taste-profile", headers=headers)).json()
    assert empty == {"total_analyses": 0, "top_genre": None, "genre_breakdown": []}
    await _upload(client, headers, wav_bytes)
    profile = (await client.get("/api/v1/insights/taste-profile", headers=headers)).json()
    assert profile["top_genre"] == "jazz"
    assert profile["genre_breakdown"] == [{"genre": "jazz", "count": 1, "percentage": 100.0}]
