// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkAudioFile, MAX_UPLOAD_BYTES, sniffAudio } from "@/lib/audio";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)),
  );

describe("sniffAudio", () => {
  it.each([
    ["ID3 tag", bytes("ID3", [4, 0, 0, 0, 0, 0, 0, 0, 0]), "audio/mpeg"],
    ["bare MPEG frame", bytes([0xff, 0xfb, 0x90, 0x00]), "audio/mpeg"],
    ["RIFF/WAVE", bytes("RIFF", [0, 0, 0, 0], "WAVE"), "audio/wav"],
    ["FLAC", bytes("fLaC"), "audio/flac"],
    ["Ogg", bytes("OggS"), "audio/ogg"],
    ["RIFF/AVI", bytes("RIFF", [0, 0, 0, 0], "AVI "), null],
    ["PDF", bytes("%PDF-1.7"), null],
    ["empty", bytes(), null],
  ])("%s", (_, input, expected) => {
    expect(sniffAudio(input)).toBe(expected);
  });
});

describe("checkAudioFile", () => {
  it("accepts audio by content, not by name", async () => {
    const file = new File([bytes("fLaC", [0, 0, 0, 34])], "song.mp3", { type: "audio/mpeg" });
    expect(await checkAudioFile(file)).toEqual({ ok: true, mime: "audio/flac" });
  });

  it("rejects non-audio content", async () => {
    const file = new File(["hello world!"], "song.wav", { type: "audio/wav" });
    expect(await checkAudioFile(file)).toMatchObject({ ok: false });
  });

  it("rejects files over the size cap without reading them", async () => {
    const file = new File([], "big.wav");
    Object.defineProperty(file, "size", { value: MAX_UPLOAD_BYTES + 1 });
    expect(await checkAudioFile(file)).toEqual({ ok: false, error: "File is larger than 50 MB." });
  });
});
