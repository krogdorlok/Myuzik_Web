// Typed client for the same-origin auth routes and proxy; failures surface as ApiError with the server's message.
import type { HistoryResponse, PredictionResult, TasteProfile, User } from "@/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Detail = string | { msg: string }[] | undefined;

function message(status: number, detail: Detail): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]) return detail[0].msg.replace(/^Value error, /, "");
  return status >= 500 ? "Something went wrong on our side. Try again." : "Request failed.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: Detail };
    throw new ApiError(res.status, message(res.status, body.detail));
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function query(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string | number] => e[1] !== undefined,
  );
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
}

/** XHR rather than fetch: it is the only browser API that reports upload progress. */
function upload(
  file: Blob,
  name: string,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
) {
  return new Promise<PredictionResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file, name);
    xhr.open("POST", "/api/proxy/predict");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status < 300
        ? resolve(xhr.response as PredictionResult)
        : reject(new ApiError(xhr.status, message(xhr.status, xhr.response?.detail)));
    xhr.onerror = () => reject(new ApiError(0, "Network error. Check your connection."));
    signal.addEventListener("abort", () => {
      xhr.abort();
      reject(new DOMException("Upload cancelled", "AbortError"));
    });
    xhr.send(form);
  });
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", json({ email, password })),
  register: (name: string, email: string, password: string) =>
    request<{ user: User }>("/api/auth/register", json({ name, email, password })),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  history: (params: { genre?: string; limit?: number; offset?: number } = {}) =>
    request<HistoryResponse>(`/api/proxy/history${query(params)}`),
  deletePrediction: (id: string) => request<void>(`/api/proxy/history/${id}`, { method: "DELETE" }),
  tasteProfile: () => request<TasteProfile>("/api/proxy/insights/taste-profile"),
  liveTicket: () => request<{ ticket: string }>("/api/proxy/live/ticket", { method: "POST" }),
  upload,
};
