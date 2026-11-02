"""Prediction, history and insights response bodies."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class SpotifyMatch(BaseModel):
    track_name: str
    artist: str
    album: str
    album_art_url: str


class PredictionResult(BaseModel):
    prediction_id: uuid.UUID
    genre: str
    confidence: float
    all_scores: dict[str, float]
    spotify_match: SpotifyMatch | None


class HistoryItem(BaseModel):
    id: uuid.UUID
    filename: str
    genre: str
    confidence: float
    spotify_match: SpotifyMatch | None
    created_at: datetime


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    total: int


class GenreShare(BaseModel):
    genre: str
    count: int
    percentage: float


class TasteProfile(BaseModel):
    total_analyses: int
    top_genre: str | None
    genre_breakdown: list[GenreShare]
