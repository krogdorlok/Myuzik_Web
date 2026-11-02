"use client";
// Mic / file toggle (a radio group styled as segmented control) and, in file mode, a validated track + player.
import { useState, type RefObject } from "react";
import { ACCEPT, checkAudioFile } from "@/lib/audio";
import { cn } from "@/lib/utils";

export type Source = { mode: "mic" } | { mode: "file"; file?: { url: string; name: string } };

interface SourcePickerProps {
  source: Source;
  onChange: (source: Source) => void;
  disabled: boolean;
  audioRef: RefObject<HTMLAudioElement>;
  take: number;
}

export function SourcePicker({ source, onChange, disabled, audioRef, take }: SourcePickerProps) {
  const [error, setError] = useState<string | null>(null);
  const file = source.mode === "file" ? source.file : undefined;

  async function pick(f: File | undefined) {
    if (!f) return;
    const check = await checkAudioFile(f);
    setError(check.ok ? null : check.error);
    if (!check.ok) return;
    if (file) URL.revokeObjectURL(file.url);
    onChange({ mode: "file", file: { url: URL.createObjectURL(f), name: f.name } });
  }

  return (
    <div className="space-y-4">
      <fieldset disabled={disabled} className="flex gap-2">
        <legend className="sr-only">Audio source</legend>
        {(["mic", "file"] as const).map((mode) => (
          <label
            key={mode}
            className={cn(
              "flex-1 cursor-pointer rounded-md border-[0.5px] px-4 py-2.5 text-center text-sm",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
              source.mode === mode ? "border-accent text-text" : "border-[#2a2a2a] text-muted",
            )}
          >
            <input
              type="radio"
              name="source"
              value={mode}
              checked={source.mode === mode}
              onChange={() => onChange(mode === "mic" ? { mode } : { mode, file })}
              className="sr-only"
            />
            {mode === "mic" ? "Microphone" : "Play a file"}
          </label>
        ))}
      </fieldset>

      {source.mode === "file" && (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Track</span>
            <input
              type="file"
              accept={ACCEPT}
              disabled={disabled}
              onChange={(e) => void pick(e.target.files?.[0])}
              className="block w-full text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-border file:px-4 file:py-2 file:text-text"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          {/* remounted per take: a media element can join only one AudioContext in its lifetime */}
          {file && (
            <audio
              ref={audioRef}
              key={`${file.url}#${take}`}
              src={file.url}
              controls
              loop
              className="w-full"
              aria-label={file.name}
            />
          )}
        </div>
      )}
    </div>
  );
}
