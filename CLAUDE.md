# MYUZIK - Music Genre Recognition Web App

A full-stack music genre recognition application using Spotify API and ML-powered audio classification.

## Ground Rules

**MINIMAL CODE PRINCIPLE**: Every line must justify its existence. No bloat, no abstractions without immediate need, no "extra features."

- Linters configured before any application code (ESLint + Prettier for frontend, Ruff for Python backend)
- Tests written before considering any module "complete"
- Strict TypeScript throughout - no `any`
- Every external call (DB, Spotify, ML) has error handling and typed responses
- No `console.log` in production - use proper logging (pino for frontend, Python logging for backend)
- Files under ~150 lines - split if exceeded
- All env vars from `.env.local` (frontend) and `.env` (backend) - never hardcode secrets

## Architecture

```
MYUZIK/
├── frontend/          # Next.js 14 (App Router) — Vercel deployment
└── backend/           # FastAPI (Python 3.11) — Railway deployment
```

**Communication**: REST over HTTPS. Frontend sends audio as `multipart/form-data` to FastAPI. All data flows through API - no direct DB access from frontend.

**Database**: PostgreSQL on Railway (same project as backend). SQLAlchemy (async) + Alembic migrations.

**Auth**: JWT-based. Backend issues tokens, frontend stores in `httpOnly` cookies via Next.js API route proxy.

## Environment Variables

**Backend `.env`**
```
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/myuzik
JWT_SECRET=replace_with_long_random_string
JWT_EXPIRE_DAYS=7
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
FRONTEND_URL=http://localhost:3000
VGGISH_PATH=./models/vggish.tflite
LOG_LEVEL=INFO
```

**Frontend `.env.local`**
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/listen
```

## Project Structure

```
frontend/
├── src/
│   ├── app/            (auth)/sign-in, (auth)/sign-up, (app)/{page,history,insights,live}, api/{auth/[action],proxy/[...path],vitals}
│   ├── components/     auth/AuthForm · upload/{DropZone,UploadProgress} · result/{ResultCard,GenreBar}
│   │                   history/{HistoryList,HistoryItem} · insights/{TasteProfile,GenreDonut}
│   │                   live/{SourcePicker,LiveTimeline,LiveStats} · layout/{Nav,Logo,WebVitals} · ui/{Button,Input,Skeleton}
│   ├── hooks/          useUpload · useHistory · useLiveListen
│   ├── lib/            api · audio · genres · liveSocket · liveAudio · logger · utils · server/backend (server-only)
│   ├── types/          index (REST shapes) · live (WebSocket protocol, zod)
│   ├── middleware.ts   nonce CSP + signed-out redirect
│   └── tests/          Vitest + RTL
├── public/worklets/pcm-processor.js   AudioWorklet resampler
├── e2e/                Playwright (5 projects) + perf/measure scripts
└── scripts/test-metrics.mjs
backend/
├── app/                main · config · database · dependencies · ml/myuzik (LiteRT + NumPy) · models · schemas
│                       routers/{auth,predict,history,insights,live} · services/{auth,predict,history,spotify}
├── alembic/versions/0001_initial.py
├── scripts/            export_model.py (TF → LiteRT, pickle → npz) · eval.py (GTZAN accuracy)
├── tests/
└── pyproject.toml · Dockerfile · railway.toml
docs/metrics/*.json     every published number, with the command that produced it
docs/notes/M*.md        per-milestone summary + trade-offs
```

## Design System

### Palette
```
background:  #0a0a0a
surface:     #111111
border:      #1e1e1e
text:        #f0ede6
muted:       #8a8a8a (raised from #666 for 4.5:1 contrast)
accent:      #c8ff57 (lime green - CTA, top confidence, logo)
accent-dim:  #6a8a30
error:       #ff5757
```

### Typography
- Display/headings: **Syne** (700 + 800)
- Body/UI: **DM Sans** (300 + 400 + 500)
- Load via `next/font/google`

### Motion
- Page transitions: opacity 0→1 over 200ms, translateY(8px)→0
- Upload zone: scale(1.02) + border color on drag-over
- Confidence bars: animate width from 0, staggered 50ms per bar
- Skeleton placeholders for all async content

### Component Rules
- Buttons: `#c8ff57` bg, `#0a0a0a` text, Syne, max 8px radius
- Inputs: `#141414` bg, `0.5px solid #2a2a2a`, 8px radius
- Cards: `#111` bg, `0.5px solid #1e1e1e`, 12px radius
- No shadows - depth through contrast only
- Max radius: 12px (except logo icon: 6px)

## Database Models

**users table**
```python
id: UUID (PK, default uuid4)
name: str (not null)
email: str (unique, not null, indexed)
hashed_password: str (not null)
created_at: datetime (default now)
```

**predictions table**
```python
id: UUID (PK, default uuid4)
user_id: UUID (FK → users.id, cascade delete)
filename: str (not null)
genre: str (not null)
confidence: float (not null)
all_scores: JSONB (not null)
spotify_track_name: str (nullable)
spotify_artist: str (nullable)
spotify_album: str (nullable)
spotify_album_art_url: str (nullable)
created_at: datetime (default now, indexed)
```

## TypeScript Interfaces

```typescript
interface PredictionResult {
  genre: string;
  confidence: number;
  all_scores: Record<string, number>;
  spotify_match: SpotifyMatch | null;
  prediction_id: string;
}

interface SpotifyMatch {
  track_name: string;
  artist: string;
  album: string;
  album_art_url: string;
}

interface HistoryItem {
  id: string;
  filename: string;
  genre: string;
  confidence: number;
  spotify_match: SpotifyMatch | null;
  created_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface TasteProfile {
  total_analyses: number;
  top_genre: string | null;
  genre_breakdown: { genre: string; count: number; percentage: number }[];
}
```

## API Endpoints

**Auth**
- `POST /api/v1/auth/register` - Create account, return token
- `POST /api/v1/auth/login` - Login, return token
- `GET /api/v1/auth/me` - Get current user (auth required)

**Predict**
- `POST /api/v1/predict` - Upload audio, get genre prediction (auth required)

**History**
- `GET /api/v1/history?genre=&limit=&offset=` - Get user's predictions (auth required)
- `DELETE /api/v1/history/{prediction_id}` - Delete prediction (auth required, ownership check)

**Insights**
- `GET /api/v1/insights/taste-profile` - Get user's taste profile (auth required)

**Live**
- `POST /api/v1/live/ticket` - Single-use 30 s WebSocket ticket (auth required)
- `WS /ws/listen?ticket=&session=` - Binary `<u32 seq><u32 clientMs><15360 × i16>` in, JSON predictions out

## Key Implementation Notes

### FastAPI Main
- Use lifespan context manager (not deprecated `on_event`)
- Load VGGish model once at startup, store on `app.state`
- CORS: allow only `FRONTEND_URL` from env
- Request logging middleware

### ML Wrapper
- VGGish runs as a LiteRT flatbuffer (`backend/models/vggish.tflite`, bit-exact with the TF SavedModel); no TensorFlow at serve time
- Logistic regression weights live in `backend/app/ml/classifier.npz`, evaluated in NumPy (no pickle at serve time)
- Both artifacts are rebuilt by `backend/scripts/export_model.py`; TF Hub no longer serves VGGish, so the tflite ships as a GitHub release asset
- Inference runs in a threadpool behind a lock; model loaded once at startup

### Spotify Service
- Client Credentials flow
- Cache token + expiry, auto-refresh
- `search_track(genre, filename_hint)` - clean filename, search, return match or None
- Never raise on Spotify errors - return None silently

### Frontend API Proxy
- Login/register/logout via `/api/auth/[action]` (sets/clears the httpOnly cookie; same-origin JSON only)
- Everything else via `/api/proxy/[...path]`: route allow-list, header allow-list, cookie → `Authorization: Bearer`
- Token-issuing endpoints are not reachable through the proxy, so the JWT never reaches JS

### Logo Component
```tsx
<span className="font-display font-extrabold tracking-tight">
  MY<span className="text-accent">U</span>ZIK
</span>
```

## Genre Art

Generated per-genre CSS gradients (`src/lib/genres.ts`); no image assets (the Unsplash Source API is gone).

## Build Order

1. Repo setup, linters, TypeScript/Ruff config
2. Backend: config, database, ORM models, Alembic migration
3. Backend: Auth router + service + tests
4. Backend: Myuzik ML wrapper + test with real audio
5. Backend: Spotify service + tests (mocked)
6. Backend: Predict + history + insights routers + tests
7. Frontend: Design system (Tailwind, fonts, CSS vars)
8. Frontend: Auth pages + `useAuth` hook
9. Frontend: API proxy route
10. Frontend: Welcome screen + upload + `useUpload`
11. Frontend: ResultCard with animated bars
12. Frontend: History page
13. Frontend: Insights page (partial, schema-ready)
14. Frontend: Component/hook tests
15. Dockerfile + Railway config
16. Deploy + smoke test

## Deployment

### Railway (Backend)
See `backend/Dockerfile` (uv install from `pyproject.toml`, checksum-pinned VGGish download, non-root user).

**Note**: `--workers 1` is intentional - VGGish on `app.state` is not process-safe.

### Vercel (Frontend)
- Root directory `frontend`; set `BACKEND_URL` and `NEXT_PUBLIC_WS_URL` in the dashboard
- No rewrites needed - proxy route handles REST; the WebSocket connects to the backend directly with a ticket

## Future Extensibility (Schema-Ready, Not Implemented)

- Genre recommendations: `all_scores` JSONB + taste-profile endpoint provide input shape
- Multi-label output: Full probability distribution already captured
- Playlist analysis: History table has all data needed
- Social/sharing: Add `is_public` boolean column in future migration
