"""Score the production inference path (decode_clip -> VGGish -> NumPy LR) on the held-out GTZAN
validation split the classifier never trained on. Writes accuracy, macro-F1 and the confusion matrix.

usage: python scripts/eval.py <ml-project-root> [out.json]
  <ml-project-root> holds data/processed/splits.json and the GTZAN files it references.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings  # noqa: E402
from app.ml.myuzik import GenreModel, decode_clip, top_genre  # noqa: E402

root = Path(sys.argv[1])
out = Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).resolve().parents[2] / "docs/metrics/model.json")
split = json.loads((root / "data/processed/splits.json").read_text())["validation"]

model = GenreModel(settings.vggish_path, settings.classifier_path)
index = {g: i for i, g in enumerate(model.labels)}
confusion = np.zeros((len(index), len(index)), dtype=int)
start = time.perf_counter()
for item in split:
    genre, _ = top_genre(model.classify(decode_clip((root / item["filepath"]).read_bytes())))
    confusion[index[item["genre_name"]], index[genre]] += 1
seconds = time.perf_counter() - start

tp = np.diag(confusion)
precision = tp / np.maximum(confusion.sum(0), 1)
recall = tp / np.maximum(confusion.sum(1), 1)
f1 = 2 * precision * recall / np.maximum(precision + recall, 1e-12)
result = {
    "dataset": "GTZAN genres_original, held-out validation split (splits.json, seed 42)",
    "n_clips": int(confusion.sum()),
    "accuracy": round(float(tp.sum() / confusion.sum()), 4),
    "macro_f1": round(float(f1.mean()), 4),
    "per_class_f1": {g: round(float(f1[i]), 4) for g, i in index.items()},
    "confusion_matrix": {"labels": model.labels, "rows_true_cols_pred": confusion.tolist()},
    "mean_inference_ms_per_clip": round(seconds / len(split) * 1000, 1),
    "command": "cd backend && python scripts/eval.py <ml-project-root>",
    "commit": subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip(),  # noqa: S607
    "date": time.strftime("%Y-%m-%d"),
}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({k: result[k] for k in ("n_clips", "accuracy", "macro_f1", "mean_inference_ms_per_clip")}))
