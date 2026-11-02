"use client";
// Drag-and-drop target that is also a real, keyboard-focusable file input.
import { useId, useState, type DragEvent } from "react";
import { ACCEPT } from "@/lib/audio";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFile: (file: File) => void;
  error?: string;
}

export function DropZone({ onFile, error }: DropZoneProps) {
  const id = useId();
  const [over, setOver] = useState(false);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center",
          "transition-[transform,border-color,background-color] duration-200 focus-within:border-accent",
          over ? "scale-[1.02] border-accent bg-accent/5" : "border-[#2a2a2a] hover:border-muted",
        )}
      >
        <span className="font-display text-lg font-bold">Drop a track or browse</span>
        <span className="mt-1 text-sm text-muted">
          MP3, WAV, FLAC or OGG · up to 50 MB · first 20 s analysed
        </span>
        <input
          id={id}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
