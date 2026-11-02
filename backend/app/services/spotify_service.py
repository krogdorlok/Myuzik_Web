"""Spotify client-credentials search. Best effort: any failure yields None, never an error."""

import logging
import re
import time

import httpx

from app.config import settings
from app.schemas.prediction import SpotifyMatch

logger = logging.getLogger(__name__)


class SpotifyService:
    def __init__(self) -> None:
        self.client = httpx.AsyncClient(timeout=5)
        self._token: str | None = None
        self._expires_at = 0.0

    async def _get_token(self) -> str:
        if self._token and time.monotonic() < self._expires_at:
            return self._token
        response = await self.client.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "client_credentials"},
            auth=(settings.spotify_client_id, settings.spotify_client_secret),
        )
        response.raise_for_status()
        body = response.json()
        self._token = body["access_token"]
        self._expires_at = time.monotonic() + body["expires_in"] - 60
        return self._token

    @staticmethod
    def clean_filename(filename: str) -> str:
        stem = re.sub(r"\.[^.]+$", "", filename)
        return re.sub(r"[_\-\s]+", " ", stem).strip()

    async def search_track(self, filename: str) -> SpotifyMatch | None:
        query = self.clean_filename(filename)
        if not query or not settings.spotify_client_id:
            return None
        try:
            response = await self.client.get(
                "https://api.spotify.com/v1/search",
                params={"q": query, "type": "track", "limit": 1},
                headers={"Authorization": f"Bearer {await self._get_token()}"},
            )
            response.raise_for_status()
            track = response.json()["tracks"]["items"][0]
            return SpotifyMatch(
                track_name=track["name"],
                artist=track["artists"][0]["name"],
                album=track["album"]["name"],
                album_art_url=track["album"]["images"][0]["url"],
            )
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
            logger.info("spotify lookup skipped: %s", type(e).__name__)
            return None


spotify = SpotifyService()
