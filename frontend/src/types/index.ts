// Shapes returned by the FastAPI backend (mirrors backend/app/schemas).
export interface SpotifyMatch {
  track_name: string;
  artist: string;
  album: string;
  album_art_url: string;
}

export interface PredictionResult {
  prediction_id: string;
  genre: string;
  confidence: number;
  all_scores: Record<string, number>;
  spotify_match: SpotifyMatch | null;
}

export interface HistoryItem {
  id: string;
  filename: string;
  genre: string;
  confidence: number;
  spotify_match: SpotifyMatch | null;
  created_at: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface TasteProfile {
  total_analyses: number;
  top_genre: string | null;
  genre_breakdown: { genre: string; count: number; percentage: number }[];
}
