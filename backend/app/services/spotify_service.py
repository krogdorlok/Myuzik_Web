import re
from datetime import datetime, timedelta

import httpx

from app.config import settings
from app.schemas.prediction import SpotifyMatch


class SpotifyService:
    def __init__(self):
        self.client_id = settings.spotify_client_id
        self.client_secret = settings.spotify_client_secret
        self._token: str | None = None
        self._token_expiry: datetime | None = None

    async def _get_token(self) -> str:
        if self._token and self._token_expiry and datetime.utcnow() < self._token_expiry:
            return self._token

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://accounts.spotify.com/api/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )
            response.raise_for_status()
            data = response.json()
            self._token = data["access_token"]
            self._token_expiry = datetime.utcnow() + timedelta(seconds=data["expires_in"] - 60)
            return self._token

    def _clean_filename(self, filename: str) -> str:
        cleaned = re.sub(r"\.[^.]+$", "", filename)  # Remove extension
        cleaned = re.sub(r"[_\-]+", " ", cleaned)  # Replace _ and - with space
        return cleaned.lower().strip()

    async def search_track(self, genre: str, filename_hint: str) -> SpotifyMatch | None:
        try:
            query = self._clean_filename(filename_hint)
            if not query:
                return None

            token = await self._get_token()
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.spotify.com/v1/search",
                    params={"q": query, "type": "track", "limit": "1"},
                    headers={"Authorization": f"Bearer {token}"},
                )
                response.raise_for_status()
                data = response.json()

                if not data.get("tracks", {}).get("items"):
                    return None

                track = data["tracks"]["items"][0]
                return SpotifyMatch(
                    track_name=track["name"],
                    artist=track["artists"][0]["name"],
                    album=track["album"]["name"],
                    album_art_url=track["album"]["images"][0]["url"],
                )
        except Exception:
            return None


spotify_service = SpotifyService()
