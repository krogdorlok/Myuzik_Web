// Upload/analysis progress with a native <progress> element and a cancel action.
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/utils";

interface UploadProgressProps {
  file: File;
  progress: number | null;
  onCancel: () => void;
}

export function UploadProgress({ file, progress, onCancel }: UploadProgressProps) {
  const label = progress === null ? "Analysing…" : `Uploading ${Math.round(progress * 100)}%`;
  return (
    <div className="rounded-lg border-[0.5px] border-border bg-surface p-6">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <p className="truncate font-medium">{file.name}</p>
        <p className="shrink-0 text-sm text-muted">{formatBytes(file.size)}</p>
      </div>
      <progress
        aria-label={label}
        value={progress ?? undefined}
        max={1}
        className="h-1.5 w-full appearance-none overflow-hidden rounded-full bg-border [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-accent"
      />
      <div className="mt-3 flex items-center justify-between">
        <p aria-live="polite" className="text-sm text-muted">
          {label}
        </p>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
