from pydantic import BaseModel


class SpotifyMatch(BaseModel):
    track_name: str
    artist: str
    album: str
    album_art_url: str


class PredictionResult(BaseModel):
    prediction_id: str
    genre: str
    confidence: float
    all_scores: dict[str, float]
    spotify_match: SpotifyMatch | None


class HistoryItem(BaseModel):
    id: str
    filename: str
    genre: str
    confidence: float
    spotify_match: SpotifyMatch | None
    created_at: str

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    total: int


class TasteProfile(BaseModel):
    total_analyses: int
    top_genre: str
    genre_breakdown: list[dict[str, int | float]]
