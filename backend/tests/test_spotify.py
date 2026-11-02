"""Spotify search against a mocked transport."""

import httpx
import pytest

from app.config import settings
from app.services.spotify_service import SpotifyService

TRACK = {
    "name": "So What",
    "artists": [{"name": "Miles Davis"}],
    "album": {"name": "Kind of Blue", "images": [{"url": "https://i.scdn.co/x"}]},
}


def service(handler) -> SpotifyService:
    svc = SpotifyService()
    svc.client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return svc


@pytest.fixture(autouse=True)
def credentials(monkeypatch):
    monkeypatch.setattr(settings, "spotify_client_id", "id")
    monkeypatch.setattr(settings, "spotify_client_secret", "secret")


def test_clean_filename():
    assert SpotifyService.clean_filename("miles_davis-so--what.mp3") == "miles davis so what"


async def test_search_returns_match_and_caches_token():
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        if request.url.host == "accounts.spotify.com":
            return httpx.Response(200, json={"access_token": "t", "expires_in": 3600})
        assert request.headers["Authorization"] == "Bearer t"
        return httpx.Response(200, json={"tracks": {"items": [TRACK]}})

    svc = service(handler)
    match = await svc.search_track("so_what.mp3")
    await svc.search_track("so_what.mp3")
    assert match and match.artist == "Miles Davis" and match.album_art_url == "https://i.scdn.co/x"
    assert calls.count("/api/token") == 1


@pytest.mark.parametrize(
    "search",
    [
        httpx.Response(500),
        httpx.Response(200, json={"tracks": {"items": []}}),
        httpx.Response(200, text="not json"),
    ],
)
async def test_search_never_raises(search: httpx.Response):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "accounts.spotify.com":
            return httpx.Response(200, json={"access_token": "t", "expires_in": 3600})
        return search

    assert await service(handler).search_track("x.mp3") is None


async def test_search_survives_network_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down")

    assert await service(handler).search_track("x.mp3") is None
