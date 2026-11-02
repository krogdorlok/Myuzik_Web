"""Rebuild the serving artifacts from the original ML project and record parity + latency.

TF Hub no longer serves VGGish, so the cached SavedModel is converted to a LiteRT flatbuffer
(builtin ops only, so serving needs ai-edge-litert instead of TensorFlow), and the scikit-learn
pickle is reduced to plain NumPy weights so nothing is unpickled at serve time.

usage: uv run --no-project -p 3.11 --with tensorflow==2.21.0 --with ai-edge-litert==2.3.0 \
         --with scikit-learn==1.9.0 --with joblib --with soundfile --with soxr \
         python -I scripts/export_model.py <vggish_saved_model_dir> <classifier_model.pkl> <sample.wav>
"""

import json
import os
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import soundfile as sf
import soxr
import tensorflow as tf
from ai_edge_litert.interpreter import Interpreter

backend = Path(__file__).resolve().parents[1]
saved_model, pickle_path, sample = sys.argv[1:4]
tflite_path, npz_path = backend / "models/vggish.tflite", backend / "app/ml/classifier.npz"

vggish = tf.saved_model.load(saved_model)
fn = vggish.__call__.get_concrete_function(tf.TensorSpec([None], tf.float32))
converter = tf.lite.TFLiteConverter.from_concrete_functions([fn], vggish)
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
tflite_path.parent.mkdir(exist_ok=True)
tflite_path.write_bytes(converter.convert())

bundle = joblib.load(pickle_path)  # noqa: S301  (our own trusted artifact; this is the last time it is unpickled)
clf, mapping = bundle["classifier"], bundle["label_mapping"]
labels = np.array(sorted(mapping, key=mapping.get))
np.savez(npz_path, coef=clf.coef_.astype(np.float32), intercept=clf.intercept_.astype(np.float32), labels=labels)

audio, sr = sf.read(sample, dtype="float32", always_2d=True)
clip = soxr.resample(audio.mean(axis=1), sr, 16_000)[:320_000].astype(np.float32)
lite = Interpreter(model_path=str(tflite_path), num_threads=os.cpu_count())


def run_lite(x: np.ndarray) -> np.ndarray:
    lite.resize_tensor_input(lite.get_input_details()[0]["index"], [len(x)])
    lite.allocate_tensors()
    lite.set_tensor(lite.get_input_details()[0]["index"], x)
    lite.invoke()
    return lite.get_tensor(lite.get_output_details()[0]["index"])


def median_ms(f, x: np.ndarray) -> float:
    f(x)
    times = []
    for _ in range(7):
        start = time.perf_counter()
        f(x)
        times.append((time.perf_counter() - start) * 1000)
    return round(sorted(times)[3], 1)


z = np.random.default_rng(0).normal(size=(64, 128))
logits = z @ clf.coef_.T + clf.intercept_
softmax = np.exp(logits - logits.max(1, keepdims=True))
softmax /= softmax.sum(1, keepdims=True)
run_tf = lambda x: vggish(tf.constant(x)).numpy()  # noqa: E731
windows = {"clip_20s": clip, "live_window_2_88s": clip[:46_080]}
report = {
    "embedding_max_abs_diff_tf_vs_litert": float(max(np.abs(run_tf(x) - run_lite(x)).max() for x in windows.values())),
    "classifier_max_abs_diff_numpy_vs_sklearn": float(np.abs(softmax - clf.predict_proba(z)).max()),
    "median_latency_ms": {
        k: {"tensorflow": median_ms(run_tf, x), "litert": median_ms(run_lite, x)} for k, x in windows.items()
    },
    "artifact_bytes": {"vggish.tflite": tflite_path.stat().st_size, "classifier.npz": npz_path.stat().st_size},
    "machine": "local dev (Apple Silicon, 8 cores)",
    "command": "see scripts/export_model.py docstring",
    "date": time.strftime("%Y-%m-%d"),
}
out = backend.parent / "docs/metrics/model-export.json"
out.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
