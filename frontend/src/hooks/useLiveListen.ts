"use client";
// Live Listen state: capture → LiveSocket → a transcript-like genre timeline. Pauses while the tab is hidden.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { startCapture, type Capture, type LiveSource } from "@/lib/liveAudio";
import { LiveSocket, type LiveStats } from "@/lib/liveSocket";
import type { LiveStatus, Prediction } from "@/types/live";

export interface Segment {
  genre: string;
  confidence: number;
  startS: number;
  endS: number;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/listen";

export function useLiveListen() {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Prediction | null>(null);
  const [timeline, setTimeline] = useState<Segment[]>([]);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const socket = useRef<LiveSocket | null>(null);
  const capture = useRef<Capture | null>(null);
  // Bumped by every start/stop so late results from a superseded run are disposed, never adopted.
  const run = useRef(0);

  const stop = useCallback(async () => {
    run.current++;
    socket.current?.stop();
    socket.current = null;
    setStatus("idle");
    const c = capture.current;
    capture.current = null;
    await c?.stop();
  }, []);

  const start = useCallback(
    async (source: LiveSource) => {
      await stop();
      const id = run.current;
      setError(null);
      setCurrent(null);
      setTimeline([]);
      const live = new LiveSocket({
        url: WS_URL,
        getTicket: async () => (await api.liveTicket()).ticket,
        onStatus: (s, message) => {
          if (id !== run.current) return;
          setStatus(s);
          if (message) setError(message);
          if (s === "error") {
            void capture.current?.stop();
            capture.current = null;
          }
        },
        onPrediction: (p) => {
          if (id !== run.current) return;
          const at = (performance.now() - live.stats.startedAt) / 1000;
          setCurrent(p);
          setStats({ ...live.stats });
          setTimeline((t) => {
            const last = t[t.length - 1];
            if (last?.genre === p.genre)
              return [...t.slice(0, -1), { ...last, endS: at, confidence: p.confidence }];
            return [
              ...t,
              { genre: p.genre, confidence: p.confidence, startS: last?.endS ?? 0, endS: at },
            ];
          });
        },
      });
      socket.current = live;
      live.start();
      try {
        const c = await startCapture(source, (pcm) => live.send(pcm));
        if (id !== run.current) return void c.stop();
        capture.current = c;
      } catch (err) {
        if (id !== run.current) return;
        await stop();
        setStatus("error");
        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Microphone access was blocked. Allow it in your browser settings, or play a file instead."
            : "Couldn't start audio capture in this browser.",
        );
      }
    },
    [stop],
  );

  useEffect(() => {
    const onVisibility = () => {
      const c = capture.current;
      if (!c) return;
      void (document.hidden ? c.context.suspend() : c.context.resume());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void stop();
    };
  }, [stop]);

  return { status, error, current, timeline, stats, start, stop };
}
