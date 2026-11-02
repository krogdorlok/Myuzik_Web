// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

type Processor = {
  process(inputs: Float32Array[][]): boolean;
  port: { postMessage(f: Int16Array): void };
};
let Ctor: new () => Processor;

beforeAll(() => {
  Object.assign(globalThis, {
    sampleRate: 48_000,
    AudioWorkletProcessor: class {
      port = { postMessage: () => undefined };
    },
    registerProcessor: (_: string, c: new () => Processor) => (Ctor = c),
  });
  // Evaluated as a classic script with injected globals, exactly as AudioWorkletGlobalScope runs it.
  runInThisContext(readFileSync("public/worklets/pcm-processor.js", "utf8"));
});

function run(frequency: number, seconds: number, channels = 1): Int16Array[] {
  const p = new Ctor();
  const frames: Int16Array[] = [];
  p.port.postMessage = (f) => frames.push(f);
  const total = 48_000 * seconds;
  for (let start = 0; start < total; start += 128) {
    const block = Float32Array.from(
      { length: 128 },
      (_, i) => 0.5 * Math.sin((2 * Math.PI * frequency * (start + i)) / 48_000),
    );
    expect(p.process([Array.from({ length: channels }, () => block)])).toBe(true);
  }
  return frames;
}

const peak = (f: Int16Array) => f.slice(2000).reduce((m, v) => Math.max(m, Math.abs(v)), 0) / 32768;

describe("pcm-processor worklet", () => {
  it("emits exact 0.96 s frames at 16 kHz", () => {
    const frames = run(440, 2);
    expect(frames).toHaveLength(2); // 2 s × 16 kHz = 32,000 samples → two full 15,360-sample frames
    expect(frames.every((f) => f.length === 15_360)).toBe(true);
  });

  it("keeps in-band audio and downmixes channels", () => {
    expect(peak(run(1_000, 1, 2)[0])).toBeCloseTo(0.5, 1);
  });

  it.each([9_000, 12_000, 20_000])(
    "keeps a %d Hz tone from aliasing into the model's band",
    (hz) => {
      expect(peak(run(hz, 1)[0])).toBeLessThan(0.02);
    },
  );
});
