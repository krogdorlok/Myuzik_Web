# MYUZIK

A full-stack music genre recognition web application powered by Spotify API and machine learning.

## Tech Stack

**Backend:**
- Python 3.11 + FastAPI
- SQLAlchemy (async) + PostgreSQL
- Alembic for migrations
- JWT authentication
- Spotify Web API integration

**Frontend:**
- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Framer Motion
- Zustand for state management

## Project Structure

```
myuzik/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── ml/
│   │   └── dependencies.py
│   ├── tests/
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/         # Next.js frontend
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── hooks/
    │   ├── lib/
    │   └── types/
    ├── public/
    │   └── genre-images/
    └── package.json
```

## Environment Setup

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/myuzik
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRE_DAYS=7
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
FRONTEND_URL=http://localhost:3000
MODEL_PATH=./data/processed/classifier_model.pkl
LOG_LEVEL=INFO
```

### Frontend (.env.local)
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

## Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features

- **Authentication**: JWT-based with secure httpOnly cookies
- **Genre Recognition**: ML-powered audio classification
- **Spotify Integration**: Track metadata enrichment
- **History**: View and manage past predictions
- **Insights**: Taste profile and genre breakdown

## API Endpoints

### Auth
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Predict
- `POST /api/v1/predict` - Upload audio for genre prediction

### History
- `GET /api/v1/history` - Get user's prediction history
- `DELETE /api/v1/history/{id}` - Delete prediction

### Insights
- `GET /api/v1/insights/taste-profile` - Get user's taste profile

## Testing

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## Deployment

### Backend (Railway)
- Dockerfile included
- Uses PostgreSQL service
- Single worker for ML model in memory

### Frontend (Vercel)
- Next.js 14 App Router compatible
- API proxy for secure token handling

## License

MIT
