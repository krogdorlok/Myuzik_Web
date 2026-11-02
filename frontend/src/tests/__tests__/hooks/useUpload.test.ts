import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUpload } from "@/hooks/useUpload";
import { ApiError } from "@/lib/api";
import { sampleResult } from "../../mocks";

const api = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api }));

const wav = () => new File([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69])], "a.wav");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUpload", () => {
  it("moves through uploading → analysing → done, sending the sniffed MIME type", async () => {
    let report: (f: number) => void = () => undefined;
    let finish: (r: typeof sampleResult) => void = () => undefined;
    api.upload.mockImplementation((blob: Blob, _name: string, onProgress: (f: number) => void) => {
      expect(blob.type).toBe("audio/wav");
      report = onProgress;
      return new Promise((r) => (finish = r));
    });
    const { result } = renderHook(() => useUpload());
    act(() => void result.current.start(wav()));
    await waitFor(() =>
      expect(result.current.state).toMatchObject({ phase: "uploading", progress: 0 }),
    );
    act(() => report(0.5));
    expect(result.current.state).toMatchObject({ phase: "uploading", progress: 0.5 });
    act(() => report(1));
    expect(result.current.state.phase).toBe("analyzing");
    await act(async () => finish(sampleResult));
    expect(result.current.state).toMatchObject({ phase: "done", result: sampleResult });
  });

  it("rejects non-audio files without uploading", async () => {
    const { result } = renderHook(() => useUpload());
    await act(() => result.current.start(new File(["hello world!"], "x.wav")));
    expect(result.current.state).toMatchObject({ phase: "error" });
    expect(api.upload).not.toHaveBeenCalled();
  });

  it("returns to idle when cancelled", async () => {
    api.upload.mockImplementation(
      (_b: Blob, _n: string, _p: unknown, signal: AbortSignal) =>
        new Promise((_, reject) =>
          signal.addEventListener("abort", () => reject(new DOMException("x", "AbortError"))),
        ),
    );
    const { result } = renderHook(() => useUpload());
    act(() => void result.current.start(wav()));
    await waitFor(() => expect(result.current.state.phase).toBe("uploading"));
    act(() => result.current.cancel());
    await waitFor(() => expect(result.current.state.phase).toBe("idle"));
  });

  it("reports server errors and can reset", async () => {
    api.upload.mockRejectedValue(new ApiError(415, "Upload an MP3, WAV, FLAC or OGG file"));
    const { result } = renderHook(() => useUpload());
    await act(() => result.current.start(wav()));
    expect(result.current.state).toEqual({
      phase: "error",
      error: "Upload an MP3, WAV, FLAC or OGG file",
    });
    act(() => result.current.reset());
    expect(result.current.state.phase).toBe("idle");
  });
});
