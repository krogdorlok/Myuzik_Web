"""Genre model: VGGish (LiteRT flatbuffer, bit-exact with the TF SavedModel) embeds 0.96 s frames,
frame embeddings are averaged, and a multinomial logistic regression runs in NumPy."""

import io
import os
import threading

import numpy as np
import soundfile as sf
import soxr

SAMPLE_RATE = 16_000
CLIP_SECONDS = 20
FRAME_SAMPLES = 15_360


class GenreModel:
    def __init__(self, vggish_path: str, classifier_path: str) -> None:
        from ai_edge_litert.interpreter import Interpreter

        self._vggish = Interpreter(model_path=vggish_path, num_threads=os.cpu_count())
        self._input = self._vggish.get_input_details()[0]["index"]
        self._output = self._vggish.get_output_details()[0]["index"]
        self._length = 0
        # The interpreter isn't thread-safe; one lock serialises inference (fine at --workers 1,
        # each call already uses every core). Upgrade path: an interpreter pool if uploads queue up.
        self._lock = threading.Lock()
        weights = np.load(classifier_path, allow_pickle=False)
        self._coef, self._intercept = weights["coef"], weights["intercept"]
        self.labels = [str(label) for label in weights["labels"]]

    def embed(self, waveform: np.ndarray) -> np.ndarray:
        with self._lock:
            if len(waveform) != self._length:
                self._vggish.resize_tensor_input(self._input, [len(waveform)])
                self._vggish.allocate_tensors()
                self._length = len(waveform)
            self._vggish.set_tensor(self._input, waveform.astype(np.float32, copy=False))
            self._vggish.invoke()
            frames = self._vggish.get_tensor(self._output)
        if not len(frames):
            raise ValueError("audio shorter than one VGGish frame")
        return frames.mean(axis=0)

    def classify(self, waveform: np.ndarray) -> dict[str, float]:
        logits = self._coef @ self.embed(waveform) + self._intercept
        probs = np.exp(logits - logits.max())
        probs /= probs.sum()
        return {label: round(float(p), 4) for label, p in zip(self.labels, probs, strict=True)}


def decode_clip(data: bytes) -> np.ndarray:
    """Decode WAV/FLAC/OGG/MP3 to the 16 kHz mono 20 s clip the classifier was trained on.
    Only the first 20 s of frames are decoded, so a small, highly compressed file can't balloon in memory."""
    with sf.SoundFile(io.BytesIO(data)) as f:
        if not (8_000 <= f.samplerate <= 192_000 and 1 <= f.channels <= 8):
            raise ValueError("unsupported sample rate or channel count")
        sr = f.samplerate
        audio = f.read(frames=sr * CLIP_SECONDS, dtype="float32", always_2d=True).mean(axis=1)
    if sr != SAMPLE_RATE:
        audio = soxr.resample(audio, sr, SAMPLE_RATE)
    n = SAMPLE_RATE * CLIP_SECONDS
    return np.pad(audio[:n], (0, max(0, n - len(audio))))


def top_genre(scores: dict[str, float]) -> tuple[str, float]:
    genre = max(scores, key=scores.__getitem__)
    return genre, scores[genre]
