// Client-side upload checks mirroring the server: size cap and magic-byte sniffing.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ACCEPT = ".mp3,.wav,.flac,.ogg,audio/mpeg,audio/wav,audio/flac,audio/ogg";

export type AudioMime = "audio/mpeg" | "audio/wav" | "audio/flac" | "audio/ogg";

export function sniffAudio(b: Uint8Array): AudioMime | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (ascii(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return "audio/mpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "audio/wav";
  if (ascii(0, 4) === "fLaC") return "audio/flac";
  if (ascii(0, 4) === "OggS") return "audio/ogg";
  return null;
}

export type AudioCheck = { ok: true; mime: AudioMime } | { ok: false; error: string };

export async function checkAudioFile(file: File): Promise<AudioCheck> {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File is larger than 50 MB." };
  const mime = sniffAudio(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  return mime
    ? { ok: true, mime }
    : { ok: false, error: "That doesn't look like an MP3, WAV, FLAC or OGG file." };
}
