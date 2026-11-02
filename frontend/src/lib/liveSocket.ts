// Streams PCM frames over a ticketed WebSocket. Reconnects with exponential backoff + jitter and resumes the
// server-side session; drops frames (never queues) under backpressure; measures latency by echoed seq.
import {
  FRAME_BYTES,
  encodeFrame,
  ServerMessage,
  type LiveStatus,
  type Prediction,
} from "@/types/live";

const MAX_BUFFERED_FRAMES = 4;
const MAX_ATTEMPTS = 6;

export interface LiveStats {
  latenciesMs: number[];
  framesSent: number;
  framesDropped: number;
  bytesSent: number;
  reconnects: number;
  recoveryMs: number[];
  startedAt: number;
}

interface Options {
  url: string;
  getTicket: () => Promise<string>;
  onPrediction: (p: Prediction) => void;
  onStatus: (s: LiveStatus, error?: string) => void;
}

export const backoffMs = (attempt: number, random = Math.random) =>
  Math.min(8000, 500 * 2 ** attempt) * (0.5 + random() / 2);

export class LiveSocket {
  readonly stats: LiveStats = {
    latenciesMs: [],
    framesSent: 0,
    framesDropped: 0,
    bytesSent: 0,
    reconnects: 0,
    recoveryMs: [],
    startedAt: 0,
  };
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private seq = 0;
  private attempt = 0;
  private droppedAt = 0;
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly sentAt = new Map<number, number>();

  constructor(private readonly opts: Options) {}

  start() {
    this.stats.startedAt = performance.now();
    void this.connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.ws?.close(1000);
    this.opts.onStatus("idle");
  }

  send(pcm: Int16Array) {
    const ws = this.ws;
    if (
      !ws ||
      ws.readyState !== WebSocket.OPEN ||
      !this.sessionId ||
      ws.bufferedAmount > MAX_BUFFERED_FRAMES * FRAME_BYTES
    ) {
      this.stats.framesDropped++;
      return;
    }
    const seq = ++this.seq;
    const now = performance.now();
    this.sentAt.set(seq, now);
    ws.send(encodeFrame(seq, now, pcm));
    this.stats.framesSent++;
    this.stats.bytesSent += FRAME_BYTES;
  }

  private async connect() {
    this.opts.onStatus(this.attempt ? "reconnecting" : "connecting");
    let ticket: string;
    try {
      ticket = await this.opts.getTicket();
    } catch {
      return this.retry();
    }
    if (this.stopped) return;
    const params = new URLSearchParams({
      ticket,
      ...(this.sessionId && { session: this.sessionId }),
    });
    const ws = new WebSocket(`${this.opts.url}?${params}`);
    ws.binaryType = "arraybuffer";
    ws.onmessage = (e) => this.receive(e.data);
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (!this.stopped) this.retry();
    };
    this.ws = ws;
  }

  private receive(data: unknown) {
    if (this.stopped) return;
    let parsed: ReturnType<typeof ServerMessage.safeParse>;
    try {
      parsed = ServerMessage.safeParse(JSON.parse(String(data)));
    } catch {
      return;
    }
    if (!parsed.success) return;
    const msg = parsed.data;
    if (msg.type === "ready") {
      if (this.droppedAt) this.stats.recoveryMs.push(performance.now() - this.droppedAt);
      this.sessionId = msg.sessionId;
      this.attempt = 0;
      this.droppedAt = 0;
      this.opts.onStatus("live");
    } else if (msg.type === "prediction") {
      const sent = this.sentAt.get(msg.seq);
      if (sent !== undefined) this.stats.latenciesMs.push(performance.now() - sent);
      for (const seq of this.sentAt.keys()) if (seq <= msg.seq) this.sentAt.delete(seq);
      this.opts.onPrediction(msg);
    }
  }

  private retry() {
    if (this.stopped) return;
    if (this.attempt >= MAX_ATTEMPTS)
      return this.opts.onStatus("error", "Lost connection to the listening service.");
    if (!this.droppedAt) {
      this.droppedAt = performance.now();
      this.stats.reconnects++;
    }
    this.opts.onStatus("reconnecting");
    this.timer = setTimeout(() => void this.connect(), backoffMs(this.attempt++));
  }
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}
