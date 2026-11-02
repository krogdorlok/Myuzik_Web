"""FastAPI app: loads the genre model once at startup, mounts routers, logs each request."""

import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine
from app.ml.myuzik import GenreModel
from app.routers import auth, history, insights, live, predict
from app.routers.predict import MAX_FILE_SIZE

logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("myuzik")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.model = GenreModel(settings.vggish_path, settings.classifier_path)
    logger.info("genre model loaded")
    yield
    await engine.dispose()


app = FastAPI(title="MYUZIK API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def limit_body(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    # Runs before multipart parsing, so oversized or unsized uploads are refused before anything is spooled.
    if request.method == "POST":
        length = request.headers.get("content-length", "")
        if not length.isdigit():
            return JSONResponse({"detail": "Content-Length required"}, status_code=411)
        if int(length) > MAX_FILE_SIZE + 64 * 1024:
            return JSONResponse({"detail": "Request body too large"}, status_code=413)
    return await call_next(request)


@app.middleware("http")
async def log_requests(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    start = time.perf_counter()
    response = await call_next(request)
    logger.info(
        "%s %s %d %.0fms", request.method, request.url.path, response.status_code, (time.perf_counter() - start) * 1000
    )
    return response


for router in (auth.router, predict.router, history.router, insights.router):
    app.include_router(router, prefix="/api/v1")
app.include_router(live.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
