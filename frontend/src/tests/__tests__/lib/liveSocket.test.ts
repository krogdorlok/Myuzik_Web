import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backoffMs, LiveSocket, percentile } from "@/lib/liveSocket";
import { encodeFrame, FRAME_BYTES, FRAME_SAMPLES } from "@/types/live";

class MockSocket {
  static OPEN = 1;
  static all: MockSocket[] = [];
  readyState = 1;
  bufferedAmount = 0;
  binaryType = "blob";
  sent: ArrayBuffer[] = [];
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(readonly url: string) {
    MockSocket.all.push(this);
  }
  send(b: ArrayBuffer) {
    this.sent.push(b);
  }
  close() {
    this.onclose?.();
  }
  emit(msg: unknown) {
    this.onmessage?.({ data: typeof msg === "string" ? msg : JSON.stringify(msg) });
  }
}

const pcm = new Int16Array(FRAME_SAMPLES);
const flush = () => vi.advanceTimersByTimeAsync(0);

function setup() {
  const statuses: string[] = [];
  const predictions: number[] = [];
  const live = new LiveSocket({
    url: "ws://test/ws/listen",
    getTicket: async () => "t",
    onStatus: (s) => statuses.push(s),
    onPrediction: (p) => predictions.push(p.seq),
  });
  return { live, statuses, predictions };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockSocket);
  MockSocket.all = [];
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LiveSocket", () => {
  it("streams framed PCM after ready and measures latency by echoed seq", async () => {
    const { live, statuses, predictions } = setup();
    live.start();
    await flush();
    const ws = MockSocket.all[0];
    expect(ws.url).toBe("ws://test/ws/listen?ticket=t");
    live.send(pcm);
    expect(live.stats.framesDropped).toBe(1); // not ready yet
    ws.emit({ type: "ready", sessionId: "s1" });
    live.send(pcm);
    expect(new DataView(ws.sent[0]).getUint32(0, true)).toBe(1);
    expect(ws.sent[0].byteLength).toBe(FRAME_BYTES);
    ws.emit({
      type: "prediction",
      seq: 1,
      scores: { jazz: 1 },
      genre: "jazz",
      confidence: 1,
      serverMs: 5,
    });
    expect(predictions).toEqual([1]);
    expect(live.stats.latenciesMs).toHaveLength(1);
    expect(statuses).toEqual(["connecting", "live"]);
  });

  it("drops frames instead of queueing when the socket is backed up", async () => {
    const { live } = setup();
    live.start();
    await flush();
    const ws = MockSocket.all[0];
    ws.emit({ type: "ready", sessionId: "s1" });
    ws.bufferedAmount = 5 * FRAME_BYTES;
    live.send(pcm);
    expect(ws.sent).toHaveLength(0);
    expect(live.stats.framesDropped).toBe(1);
  });

  it("ignores malformed server messages", async () => {
    const { live, predictions } = setup();
    live.start();
    await flush();
    const ws = MockSocket.all[0];
    ws.emit("{not json");
    ws.emit({ type: "prediction", seq: "1" });
    ws.emit({ type: "unknown" });
    expect(predictions).toEqual([]);
  });

  it("reconnects with backoff, resumes the session and records recovery time", async () => {
    const { live, statuses } = setup();
    live.start();
    await flush();
    MockSocket.all[0].emit({ type: "ready", sessionId: "s1" });
    MockSocket.all[0].close();
    expect(statuses.at(-1)).toBe("reconnecting");
    await vi.advanceTimersByTimeAsync(600);
    expect(MockSocket.all[1].url).toContain("session=s1");
    MockSocket.all[1].emit({ type: "ready", sessionId: "s1" });
    expect(live.stats.reconnects).toBe(1);
    expect(live.stats.recoveryMs).toHaveLength(1);
    expect(statuses.at(-1)).toBe("live");
  });

  it("gives up after repeated failures and stops cleanly", async () => {
    const { live, statuses } = setup();
    live.start();
    await flush();
    for (let i = 0; i < 7; i++) {
      MockSocket.all.at(-1)!.close();
      await vi.advanceTimersByTimeAsync(10_000);
    }
    expect(statuses.at(-1)).toBe("error");
    live.stop();
    expect(statuses.at(-1)).toBe("idle");
  });
});

describe("helpers", () => {
  it("backoff grows exponentially, caps at 8 s and applies ±50% jitter", () => {
    expect(backoffMs(0, () => 1)).toBe(500);
    expect(backoffMs(0, () => 0)).toBe(250);
    expect(backoffMs(3, () => 1)).toBe(4000);
    expect(backoffMs(10, () => 1)).toBe(8000);
  });

  it("percentile uses nearest rank", () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(
      percentile(
        Array.from({ length: 100 }, (_, i) => i + 1),
        95,
      ),
    ).toBe(95);
  });

  it("encodeFrame writes a little-endian header followed by PCM", () => {
    const frame = encodeFrame(7, 4_294_967_296 + 9, Int16Array.of(-1, 2));
    const view = new DataView(frame);
    expect([
      view.getUint32(0, true),
      view.getUint32(4, true),
      view.getInt16(8, true),
      view.getInt16(10, true),
    ]).toEqual([7, 9, -1, 2]);
  });
});
