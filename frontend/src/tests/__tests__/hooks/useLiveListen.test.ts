import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { smooth, useLiveListen } from "@/hooks/useLiveListen";

const h = vi.hoisted(() => {
  const capture = {
    context: { suspend: vi.fn(), resume: vi.fn() },
    stop: vi.fn(async () => undefined),
  };
  const sockets: {
    opts: { onStatus: (s: string, m?: string) => void; onPrediction: (p: unknown) => void };
    stop: () => void;
  }[] = [];
  return { capture, sockets, startCapture: vi.fn() };
});
vi.mock("@/lib/liveAudio", () => ({ startCapture: h.startCapture }));
vi.mock("@/lib/liveSocket", () => ({
  LiveSocket: class {
    stats = {
      latenciesMs: [],
      framesSent: 0,
      framesDropped: 0,
      bytesSent: 0,
      reconnects: 0,
      recoveryMs: [],
      startedAt: 0,
    };
    stop = vi.fn();
    start = vi.fn();
    constructor(readonly opts: never) {
      h.sockets.push(this as never);
    }
  },
}));
vi.mock("@/lib/api", () => ({ api: { liveTicket: vi.fn() } }));

const prediction = (genre: string, seq = 1) => ({
  type: "prediction",
  seq,
  genre,
  confidence: 0.7,
  scores: { [genre]: 0.7 },
  serverMs: 5,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.sockets.length = 0;
  h.startCapture.mockResolvedValue(h.capture);
});

describe("useLiveListen", () => {
  it("merges consecutive same-genre predictions into timeline segments", async () => {
    const { result } = renderHook(() => useLiveListen());
    await act(() => result.current.start({ kind: "mic" }));
    const { opts } = h.sockets[0];
    act(() => opts.onStatus("live"));
    act(() => opts.onPrediction(prediction("jazz", 1)));
    act(() => opts.onPrediction(prediction("jazz", 2)));
    act(() => opts.onPrediction(prediction("rock", 3)));
    expect(result.current.current?.genre).toBe("jazz"); // one rock window isn't enough to flip the EMA
    act(() => opts.onPrediction(prediction("rock", 4)));
    expect(result.current.status).toBe("live");
    expect(result.current.timeline.map((s) => s.genre)).toEqual(["jazz", "rock"]);
    expect(result.current.current?.genre).toBe("rock");
  });

  it("stops capture and socket, and ignores late events from the old run", async () => {
    const { result } = renderHook(() => useLiveListen());
    await act(() => result.current.start({ kind: "mic" }));
    const old = h.sockets[0];
    await act(() => result.current.stop());
    expect(old.stop).toHaveBeenCalled();
    expect(h.capture.stop).toHaveBeenCalled();
    act(() => old.opts.onPrediction(prediction("jazz")));
    expect(result.current.status).toBe("idle");
    expect(result.current.timeline).toEqual([]);
  });

  it("a stop issued while start is still tearing down cancels the run outright", async () => {
    const { result } = renderHook(() => useLiveListen());
    act(() => void result.current.start({ kind: "mic" }));
    await act(() => result.current.stop());
    expect(h.startCapture).not.toHaveBeenCalled();
  });

  it("disposes a capture that resolves after stop", async () => {
    let resolve: (c: typeof h.capture) => void = () => undefined;
    h.startCapture.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useLiveListen());
    act(() => void result.current.start({ kind: "mic" }));
    await waitFor(() => expect(h.startCapture).toHaveBeenCalled());
    await act(() => result.current.stop());
    await act(async () => resolve(h.capture));
    expect(h.capture.stop).toHaveBeenCalledTimes(1);
  });

  it("explains a blocked microphone", async () => {
    h.startCapture.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    const { result } = renderHook(() => useLiveListen());
    await act(() => result.current.start({ kind: "mic" }));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/Microphone access was blocked/);
  });

  it("releases audio when the connection gives up", async () => {
    const { result } = renderHook(() => useLiveListen());
    await act(() => result.current.start({ kind: "mic" }));
    act(() => h.sockets[0].opts.onStatus("error", "Lost connection to the listening service."));
    expect(result.current.error).toBe("Lost connection to the listening service.");
    await waitFor(() => expect(h.capture.stop).toHaveBeenCalled());
  });

  it("suspends audio while the tab is hidden and cleans up on unmount", async () => {
    const { result, unmount } = renderHook(() => useLiveListen());
    await act(() => result.current.start({ kind: "mic" }));
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(h.capture.context.suspend).toHaveBeenCalled();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(h.capture.context.resume).toHaveBeenCalled();
    unmount();
    await waitFor(() => expect(h.capture.stop).toHaveBeenCalled());
  });
});

describe("smooth", () => {
  it("is an exponential moving average seeded by the first frame", () => {
    expect(smooth(null, { jazz: 1 })).toEqual({ jazz: 1 });
    expect(smooth({ jazz: 1, rock: 0 }, { jazz: 0, rock: 1 })).toEqual({ jazz: 0.65, rock: 0.35 });
  });
});
