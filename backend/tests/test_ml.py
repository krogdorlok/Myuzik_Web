"""Real-model checks; skipped unless the VGGish SavedModel and a sample clip are available."""

import os
from pathlib import Path

import numpy as np
import pytest

from app.config import settings
from app.ml.myuzik import FRAME_SAMPLES, SAMPLE_RATE, GenreModel, decode_clip, top_genre

CLIP = os.environ.get("MYUZIK_SAMPLE_CLIP", "")
pytestmark = pytest.mark.skipif(
    not (Path(settings.vggish_path).exists() and Path(CLIP).is_file()), reason="needs VGGish + MYUZIK_SAMPLE_CLIP"
)


@pytest.fixture(scope="module")
def model() -> GenreModel:
    return GenreModel(settings.vggish_path, settings.classifier_path)


def test_real_clip_is_deterministic(model: GenreModel):
    clip = decode_clip(Path(CLIP).read_bytes())
    assert clip.shape == (SAMPLE_RATE * 20,)
    first, second = model.classify(clip), model.classify(clip)
    assert first == second
    assert set(first) == set(model.labels) and abs(sum(first.values()) - 1) < 1e-3
    assert top_genre(first)[0] in model.labels


def test_three_frame_window_yields_scores(model: GenreModel):
    scores = model.classify(np.zeros(FRAME_SAMPLES * 3, dtype=np.float32))
    assert abs(sum(scores.values()) - 1) < 1e-3
