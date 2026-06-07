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
MODEL_PATH=./data/processed/classifier_model.pkl
LOG_LEVEL=INFO
```

**Frontend `.env.local`**
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

## Project Structure

```
myuzik/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── sign-in/page.tsx
│   │   │   │   └── sign-up/page.tsx
│   │   │   ├── (app)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── history/page.tsx
│   │   │   │   └── insights/page.tsx
│   │   │   ├── api/proxy/[...path]/route.ts
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/ (Button, Input, Badge, Card)
│   │   │   ├── auth/ (SignInForm, SignUpForm)
│   │   │   ├── upload/ (DropZone, UploadProgress)
│   │   │   ├── result/ (ResultCard, GenreBar, AlbumArt)
│   │   │   ├── history/ (HistoryList, HistoryItem)
│   │   │   ├── insights/ (TasteProfile, GenreDonut)
│   │   │   └── layout/ (Nav, Logo, UserAvatar)
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useUpload.ts
│   │   │   └── useHistory.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   └── types/index.ts
│   ├── public/genre-images/ (10 jpg files)
│   ├── .env.local.example
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   ├── prettier.config.mjs
│   └── package.json
│
└── backend/
    ├── app/
    │   ├── main.py
    │   ├── config.py
    │   ├── database.py
    │   ├── models/ (user.py, prediction.py)
    │   ├── schemas/ (auth.py, prediction.py, user.py)
    │   ├── routers/ (auth.py, predict.py, history.py, insights.py)
    │   ├── services/ (auth_service.py, predict_service.py, spotify_service.py, history_service.py)
    │   ├── ml/myuzik.py
    │   └── dependencies.py
    ├── tests/ (test_auth.py, test_predict.py, test_spotify.py, test_history.py)
    ├── alembic/
    ├── alembic.ini
    ├── .env.example
    ├── Dockerfile
    ├── requirements.txt
    └── ruff.toml
```

## Design System

### Palette
```
background:  #0a0a0a
surface:     #111111
border:      #1e1e1e
text:        #f0ede6
muted:       #666666
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
  created_at: string;
}

interface TasteProfile {
  total_analyses: number;
  top_genre: string;
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

## Key Implementation Notes

### FastAPI Main
- Use lifespan context manager (not deprecated `on_event`)
- Load VGGish model once at startup, store on `app.state`
- CORS: allow only `FRONTEND_URL` from env
- Request logging middleware

### ML Wrapper
- Import existing `predict_genre` function - do NOT duplicate ML logic
- Accept file path, return typed dict
- Model loaded once at startup

### Spotify Service
- Client Credentials flow
- Cache token + expiry, auto-refresh
- `search_track(genre, filename_hint)` - clean filename, search, return match or None
- Never raise on Spotify errors - return None silently

### Frontend API Proxy
- All calls via `/api/proxy/[...path]/route.ts`
- Reads `httpOnly` cookie, forwards as `Authorization: Bearer`
- Keeps JWT out of JS-accessible storage

### Logo Component
```tsx
<span className="font-display font-extrabold tracking-tight">
  MY<span className="text-accent">U</span>ZIK
</span>
```

## Genre Images

Place in `/frontend/public/genre-images/`:
`blues.jpg`, `classical.jpg`, `country.jpg`, `disco.jpg`, `hiphop.jpg`, `jazz.jpg`, `metal.jpg`, `pop.jpg`, `reggae.jpg`, `rock.jpg`

Download from: `https://source.unsplash.com/800x400/?{genre}+music`

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
```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y libsndfile1 ffmpeg libgomp1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

**Note**: `--workers 1` is intentional - VGGish on `app.state` is not process-safe.

### Vercel (Frontend)
- Set `BACKEND_URL` env var in dashboard
- No rewrites needed - proxy route handles it

## Future Extensibility (Schema-Ready, Not Implemented)

- Genre recommendations: `all_scores` JSONB + taste-profile endpoint provide input shape
- Multi-label output: Full probability distribution already captured
- Playlist analysis: History table has all data needed
- Social/sharing: Add `is_public` boolean column in future migration
