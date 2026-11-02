"""Live Listen WebSocket: ticket auth, origin check, framing, prediction cadence and session resume."""

import struct
import uuid

import numpy as np
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
from starlette.websockets import WebSocketDisconnect

from app.main import app
from app.ml.myuzik import FRAME_SAMPLES
from app.routers.live import issue_ticket
from tests.conftest import FakeModel

ORIGIN = {"origin": "http://localhost:3000"}


def frame(seq: int) -> bytes:
    return struct.pack("<II", seq, 0) + np.zeros(FRAME_SAMPLES, dtype="<i2").tobytes()


@pytest.fixture
def ws_client() -> TestClient:
    app.state.model = FakeModel()
    return TestClient(app)


async def test_ticket_requires_auth(client: AsyncClient, register):
    assert (await client.post("/api/v1/live/ticket")).status_code == 401
    r = await client.post("/api/v1/live/ticket", headers=await register())
    assert len(r.json()["ticket"]) >= 32


def test_streams_predictions_after_two_frames(ws_client: TestClient):
    with ws_client.websocket_connect(f"/ws/listen?ticket={issue_ticket(uuid.uuid4())}", headers=ORIGIN) as ws:
        assert ws.receive_json()["type"] == "ready"
        ws.send_bytes(frame(1))
        ws.send_bytes(frame(2))
        msg = ws.receive_json()
        assert (msg["type"], msg["seq"], msg["genre"]) == ("prediction", 2, "jazz")
        ws.send_bytes(b"short")
        assert ws.receive_json()["code"] == "bad_frame"


def test_ticket_is_single_use_and_origin_checked(ws_client: TestClient):
    ticket = issue_ticket(uuid.uuid4())
    with pytest.raises(WebSocketDisconnect):
        with ws_client.websocket_connect(f"/ws/listen?ticket={ticket}", headers={"origin": "https://evil.example"}):
            pass
    with pytest.raises(WebSocketDisconnect):  # the failed attempt above already consumed it
        with ws_client.websocket_connect(f"/ws/listen?ticket={ticket}", headers=ORIGIN):
            pass


def test_resume_keeps_the_frame_buffer(ws_client: TestClient):
    user = uuid.uuid4()
    with ws_client.websocket_connect(f"/ws/listen?ticket={issue_ticket(user)}", headers=ORIGIN) as ws:
        session = ws.receive_json()["sessionId"]
        ws.send_bytes(frame(1))
    url = f"/ws/listen?ticket={issue_ticket(user)}&session={session}"
    with ws_client.websocket_connect(url, headers=ORIGIN) as ws:
        assert ws.receive_json()["sessionId"] == session
        ws.send_bytes(frame(2))
        assert ws.receive_json()["seq"] == 2  # one buffered frame + this one = first prediction


def test_other_users_cannot_resume_a_session(ws_client: TestClient):
    with ws_client.websocket_connect(f"/ws/listen?ticket={issue_ticket(uuid.uuid4())}", headers=ORIGIN) as ws:
        session = ws.receive_json()["sessionId"]
    url = f"/ws/listen?ticket={issue_ticket(uuid.uuid4())}&session={session}"
    with ws_client.websocket_connect(url, headers=ORIGIN) as ws:
        assert ws.receive_json()["sessionId"] != session


def test_per_user_quota_applies_to_resumes(ws_client: TestClient):
    user = uuid.uuid4()
    url = lambda: f"/ws/listen?ticket={issue_ticket(user)}"  # noqa: E731
    with (
        ws_client.websocket_connect(url(), headers=ORIGIN) as a,
        ws_client.websocket_connect(url(), headers=ORIGIN) as b,
    ):
        a.receive_json(), b.receive_json()
        with pytest.raises(WebSocketDisconnect) as exc:
            with ws_client.websocket_connect(url(), headers=ORIGIN):
                pass
        assert exc.value.code == 1013


def test_flooded_frames_are_not_all_inferred(ws_client: TestClient):
    with ws_client.websocket_connect(f"/ws/listen?ticket={issue_ticket(uuid.uuid4())}", headers=ORIGIN) as ws:
        ws.receive_json()
        for seq in range(1, 7):
            ws.send_bytes(frame(seq))
        ws.send_bytes(b"x")  # sentinel: the reply to this marks the end of the burst
        replies = []
        while (msg := ws.receive_json())["type"] != "error":
            replies.append(msg["seq"])
        assert replies == [2]
