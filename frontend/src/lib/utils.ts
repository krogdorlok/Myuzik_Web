// Small formatting helpers shared across components.
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${parseFloat((bytes / 1024 ** i).toFixed(decimals))} ${["B", "KB", "MB", "GB"][i]}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]
  ).toUpperCase();
}
