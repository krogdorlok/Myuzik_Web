"""Live Listen: a one-time ticket authenticates a WebSocket that streams 0.96 s PCM frames in and
genre predictions out. Each binary frame is <uint32 seq><uint32 client_ms><15360 x int16 LE>."""

import asyncio
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
TICKET_TTL, RESUME_TTL, IDLE_TIMEOUT = 30.0, 60.0, 10.0
MAX_SESSIONS, MAX_PER_USER, MAX_RETAINED = 8, 2, 64
MIN_INFERENCE_GAP = 0.45  # frames carry 0.96 s of audio; anything faster than ~2x real time is a flood


@dataclass
class Session:
    user_id: uuid.UUID
    frames: deque[np.ndarray] = field(default_factory=lambda: deque(maxlen=3))
    last_seen: float = field(default_factory=time.monotonic)
    last_inference: float = 0.0
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


def _admit(user_id: uuid.UUID, session_id: str | None) -> tuple[str, Session] | None:
    """Reserve a slot (global and per-user caps apply to resumes too) and mark it connected."""
    now = time.monotonic()
    idle = sorted((s.last_seen, k) for k, s in _sessions.items() if not s.connected)
    for last_seen, key in idle:
        if now - last_seen > RESUME_TTL or len(_sessions) > MAX_RETAINED:
            del _sessions[key]
    active = [s for s in _sessions.values() if s.connected]
    if len(active) >= MAX_SESSIONS or sum(s.user_id == user_id for s in active) >= MAX_PER_USER:
        return None
    state = _sessions.get(session_id or "")
    if not (state and state.user_id == user_id and not state.connected):
        session_id, state = secrets.token_urlsafe(12), Session(user_id)
        _sessions[session_id] = state
    state.connected = True
    return session_id, state


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
    admitted = _admit(user_id, session)
    if admitted is None:
        await ws.close(code=status.WS_1013_TRY_AGAIN_LATER)
        return
    session_id, state = admitted
    model = ws.app.state.model
    try:
        await ws.accept()
        await ws.send_json({"type": "ready", "sessionId": session_id})
        while True:
            data = await asyncio.wait_for(ws.receive_bytes(), IDLE_TIMEOUT)
            state.last_seen = time.monotonic()
            if len(data) != FRAME_BYTES:
                await ws.send_json({"type": "error", "code": "bad_frame", "message": f"Expected {FRAME_BYTES} bytes"})
                continue
            seq, _ = struct.unpack_from("<II", data)
            state.frames.append(np.frombuffer(data, dtype="<i2", offset=8).astype(np.float32) / 32768)
            # VGGish needs > 15,360 samples for its first embedding; flooded frames are buffered, not inferred.
            if len(state.frames) < 2 or state.last_seen - state.last_inference < MIN_INFERENCE_GAP:
                continue
            state.last_inference = state.last_seen
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
    except TimeoutError:
        await ws.close(code=status.WS_1001_GOING_AWAY)
    except (WebSocketDisconnect, KeyError):  # KeyError: a text frame arrived where bytes were expected
        pass
    finally:
        state.connected = False
        state.last_seen = time.monotonic()
