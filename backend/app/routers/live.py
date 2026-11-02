"""Live Listen: a one-time ticket authenticates a WebSocket that streams 0.96 s PCM frames in and
genre predictions out. Each binary frame is <uint32 seq><uint32 client_ms><15360 x int16 LE>."""

import secrets
import struct
import time
import uuid
from collections import deque
from dataclasses import dataclass, field

import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from fastapi.concurrency import run_in_threadpool

from app.config import settings
from app.dependencies import CurrentUser
from app.ml.myuzik import FRAME_SAMPLES, top_genre

router = APIRouter(tags=["live"])

FRAME_BYTES = 8 + FRAME_SAMPLES * 2
TICKET_TTL, RESUME_TTL, MAX_SESSIONS = 30.0, 60.0, 8


@dataclass
class Session:
    user_id: uuid.UUID
    frames: deque[np.ndarray] = field(default_factory=lambda: deque(maxlen=3))
    last_seen: float = field(default_factory=time.monotonic)
    connected: bool = False


# In-process state is fine at --workers 1; move both maps to Redis to scale out.
_tickets: dict[str, tuple[uuid.UUID, float]] = {}
_sessions: dict[str, Session] = {}


def issue_ticket(user_id: uuid.UUID) -> str:
    now = time.monotonic()
    for key in [k for k, (_, exp) in _tickets.items() if exp < now]:
        del _tickets[key]
    ticket = secrets.token_urlsafe(24)
    _tickets[ticket] = (user_id, now + TICKET_TTL)
    return ticket


def _redeem(ticket: str) -> uuid.UUID | None:
    user_id, expires = _tickets.pop(ticket, (None, 0.0))
    return user_id if expires > time.monotonic() else None


def _session_for(user_id: uuid.UUID, session_id: str | None) -> tuple[str, Session] | None:
    now = time.monotonic()
    for key in [k for k, s in _sessions.items() if not s.connected and now - s.last_seen > RESUME_TTL]:
        del _sessions[key]
    existing = _sessions.get(session_id or "")
    if existing and existing.user_id == user_id and not existing.connected:
        return session_id, existing
    if sum(s.connected for s in _sessions.values()) >= MAX_SESSIONS:
        return None
    session_id = secrets.token_urlsafe(12)
    _sessions[session_id] = Session(user_id)
    return session_id, _sessions[session_id]


@router.post("/api/v1/live/ticket")
async def create_ticket(user: CurrentUser) -> dict[str, str]:
    return {"ticket": issue_ticket(user.id)}


@router.websocket("/ws/listen")
async def listen(ws: WebSocket, ticket: str = "", session: str | None = None) -> None:
    # Redeem first so any attempt burns the ticket; the Origin check blocks cross-site WebSocket hijacking.
    user_id = _redeem(ticket)
    if user_id is None or ws.headers.get("origin") != settings.frontend_url:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    found = _session_for(user_id, session)
    if found is None:
        await ws.close(code=status.WS_1013_TRY_AGAIN_LATER)
        return
    session_id, state = found
    state.connected = True
    await ws.accept()
    await ws.send_json({"type": "ready", "sessionId": session_id})
    model = ws.app.state.model
    try:
        while True:
            data = await ws.receive_bytes()
            state.last_seen = time.monotonic()
            if len(data) != FRAME_BYTES:
                await ws.send_json({"type": "error", "code": "bad_frame", "message": f"Expected {FRAME_BYTES} bytes"})
                continue
            seq, _ = struct.unpack_from("<II", data)
            state.frames.append(np.frombuffer(data, dtype="<i2", offset=8).astype(np.float32) / 32768)
            if len(state.frames) < 2:  # VGGish needs > 15,360 samples to emit its first embedding
                continue
            start = time.perf_counter()
            scores = await run_in_threadpool(model.classify, np.concatenate(state.frames))
            genre, confidence = top_genre(scores)
            await ws.send_json(
                {
                    "type": "prediction",
                    "seq": seq,
                    "scores": scores,
                    "genre": genre,
                    "confidence": confidence,
                    "serverMs": round((time.perf_counter() - start) * 1000, 1),
                }
            )
    except (WebSocketDisconnect, KeyError):  # KeyError: a text frame arrived where bytes were expected
        pass
    finally:
        state.connected = False
        state.last_seen = time.monotonic()
