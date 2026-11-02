// Shared test doubles: a controllable Next router and a typed stub of the API client.
import { vi } from "vitest";

export const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
export const nav = { pathname: "/", search: new URLSearchParams() };

export const nextNavigation = () => ({
  useRouter: () => router,
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.search,
});

export const sampleResult = {
  prediction_id: "p1",
  genre: "jazz",
  confidence: 0.72,
  all_scores: { jazz: 0.72, blues: 0.18, rock: 0.1 },
  spotify_match: null,
};

export const historyItem = (id: string, genre = "jazz") => ({
  id,
  filename: `${id}.wav`,
  genre,
  confidence: 0.8,
  spotify_match: null,
  created_at: "2026-11-01T12:00:00Z",
});
