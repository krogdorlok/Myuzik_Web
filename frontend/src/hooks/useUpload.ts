"use client";
// Upload state machine: idle → uploading (real progress) → analyzing → done | error, cancellable throughout.
import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { checkAudioFile } from "@/lib/audio";
import type { PredictionResult } from "@/types";

export type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; file: File; progress: number }
  | { phase: "analyzing"; file: File }
  | { phase: "done"; file: File; result: PredictionResult }
  | { phase: "error"; error: string };

export function useUpload() {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const controller = useRef<AbortController | null>(null);

  const start = useCallback(async (file: File) => {
    const check = await checkAudioFile(file);
    if (!check.ok) return setState({ phase: "error", error: check.error });

    controller.current = new AbortController();
    setState({ phase: "uploading", file, progress: 0 });
    try {
      const result = await api.upload(
        file.slice(0, file.size, check.mime),
        file.name,
        (progress) =>
          setState(
            progress < 1 ? { phase: "uploading", file, progress } : { phase: "analyzing", file },
          ),
        controller.current.signal,
      );
      setState({ phase: "done", file, result });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError")
        return setState({ phase: "idle" });
      setState({
        phase: "error",
        error: err instanceof ApiError ? err.message : "Upload failed. Try again.",
      });
    }
  }, []);

  const cancel = useCallback(() => controller.current?.abort(), []);
  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, start, cancel, reset };
}
