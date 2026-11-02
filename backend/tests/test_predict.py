"""Upload validation and prediction persistence."""

import pytest
from httpx import AsyncClient

from app.routers.predict import MAX_FILE_SIZE, is_audio


@pytest.mark.parametrize(
    ("head", "expected"),
    [
        (b"ID3\x04\x00\x00\x00\x00\x00\x00\x00\x00", True),
        (b"\xff\xfb\x90\x00" + b"\x00" * 8, True),
        (b"RIFF\x00\x00\x00\x00WAVE", True),
        (b"fLaC\x00\x00\x00\x22\x00\x00\x00\x00", True),
        (b"OggS\x00\x02\x00\x00\x00\x00\x00\x00", True),
        (b"RIFF\x00\x00\x00\x00AVI ", False),
        (b"%PDF-1.7\n\x00\x00\x00", False),
        (b"", False),
    ],
)
def test_is_audio(head: bytes, expected: bool):
    assert is_audio(head) is expected


async def test_predict_saves_result(client: AsyncClient, register, wav_bytes: bytes):
    headers = await register()
    r = await client.post("/api/v1/predict", headers=headers, files={"file": ("song.wav", wav_bytes, "audio/wav")})
    assert r.status_code == 201, r.text
    body = r.json()
    assert (body["genre"], body["confidence"], body["spotify_match"]) == ("jazz", 0.7, None)
    history = (await client.get("/api/v1/history", headers=headers)).json()
    assert history["total"] == 1 and history["items"][0]["id"] == body["prediction_id"]


async def test_predict_requires_auth(client: AsyncClient, wav_bytes: bytes):
    r = await client.post("/api/v1/predict", files={"file": ("song.wav", wav_bytes, "audio/wav")})
    assert r.status_code == 401


@pytest.mark.parametrize(
    ("name", "data", "mime", "status"),
    [
        ("evil.wav", b"MZ\x90\x00 not audio at all", "audio/wav", 415),
        ("song.wav", b"RIFF\x00\x00\x00\x00WAVE", "text/plain", 415),
        ("broken.wav", b"RIFF\x00\x00\x00\x00WAVEgarbage", "audio/wav", 422),
        ("huge.wav", b"\x00" * (MAX_FILE_SIZE + 1), "audio/wav", 413),
    ],
)
async def test_predict_rejects_bad_uploads(client: AsyncClient, register, name, data, mime, status):
    headers = await register()
    r = await client.post("/api/v1/predict", headers=headers, files={"file": (name, data, mime)})
    assert r.status_code == status


async def test_body_limit_runs_before_auth(client: AsyncClient):
    too_big = {"content-length": str(MAX_FILE_SIZE * 2), "content-type": "multipart/form-data; boundary=x"}
    assert (await client.post("/api/v1/predict", headers=too_big, content=b"")).status_code == 413


def test_decode_rejects_absurd_sample_rates():
    import io

    import numpy as np
    import soundfile as sf

    from app.ml.myuzik import decode_clip

    buf = io.BytesIO()
    sf.write(buf, np.zeros(10, dtype=np.float32), 384_000, format="WAV")
    with pytest.raises(ValueError):
        decode_clip(buf.getvalue())
