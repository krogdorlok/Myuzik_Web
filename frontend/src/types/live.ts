// Live Listen wire protocol. Client → server: binary <uint32 seq LE><uint32 clientMs LE><15,360 × int16 LE>.
// Server → client: the JSON messages below, validated at runtime because they cross a trust boundary.
import * as z from "zod/mini";

export const FRAME_SAMPLES = 15_360;
export const HEADER_BYTES = 8;
export const FRAME_BYTES = HEADER_BYTES + FRAME_SAMPLES * 2;

export const ServerMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready"), sessionId: z.string() }),
  z.object({
    type: z.literal("prediction"),
    seq: z.number(),
    scores: z.record(z.string(), z.number()),
    genre: z.string(),
    confidence: z.number(),
    serverMs: z.number(),
  }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string() }),
]);

export type ServerMessage = z.infer<typeof ServerMessage>;
export type Prediction = Extract<ServerMessage, { type: "prediction" }>;
export type LiveStatus = "idle" | "connecting" | "live" | "reconnecting" | "error";

export function encodeFrame(seq: number, clientMs: number, pcm: Int16Array): ArrayBuffer {
  const buf = new ArrayBuffer(HEADER_BYTES + pcm.byteLength);
  const view = new DataView(buf);
  view.setUint32(0, seq >>> 0, true);
  view.setUint32(4, clientMs >>> 0, true);
  new Int16Array(buf, HEADER_BYTES).set(pcm);
  return buf;
}
