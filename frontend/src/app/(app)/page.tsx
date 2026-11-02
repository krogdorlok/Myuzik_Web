"use client";
// Analyse: drop a file, watch real upload progress, get the genre breakdown.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ResultCard } from "@/components/result/ResultCard";
import { DropZone } from "@/components/upload/DropZone";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { useUpload } from "@/hooks/useUpload";

export default function AnalysePage() {
  const { state, start, cancel, reset } = useUpload();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state.phase === "done") document.getElementById("result-genre")?.focus();
  }, [state.phase]);

  return (
    <div className="space-y-8">
      <header>
        <h1
          ref={heading}
          tabIndex={-1}
          className="font-display text-3xl font-extrabold outline-none sm:text-4xl"
        >
          What are you listening to?
        </h1>
        <p className="mt-2 text-muted">
          Upload a track for a genre breakdown, or{" "}
          <Link
            href="/live"
            className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
          >
            let it listen live
          </Link>
          .
        </p>
      </header>

      {(state.phase === "idle" || state.phase === "error") && (
        <DropZone onFile={start} error={state.phase === "error" ? state.error : undefined} />
      )}
      {(state.phase === "uploading" || state.phase === "analyzing") && (
        <UploadProgress
          file={state.file}
          progress={state.phase === "uploading" ? state.progress : null}
          onCancel={cancel}
        />
      )}
      {state.phase === "done" && (
        <ResultCard
          result={state.result}
          filename={state.file.name}
          onReset={() => {
            reset();
            heading.current?.focus();
          }}
        />
      )}
    </div>
  );
}
