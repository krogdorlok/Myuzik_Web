// Server-only helpers for talking to FastAPI: base URL, session cookie options, timed fetch.
import "server-only";
import { logger } from "@/lib/logger";
import type { User } from "@/types";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
export const SESSION_COOKIE = "token";
export const TIMEOUT_MS = 30_000;

export const sessionCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
} as const;

export function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BACKEND_URL}/api/v1/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/** Browsers send Origin on every cross-site POST/DELETE (and on same-origin fetch writes). */
export function isSameOrigin(request: Request & { nextUrl: URL }): boolean {
  return request.headers.get("origin") === request.nextUrl.origin;
}

export function upstreamError(err: unknown): Response {
  logger.error({ err }, "backend request failed");
  const timedOut = err instanceof DOMException && err.name === "TimeoutError";
  return Response.json(
    { detail: timedOut ? "The server took too long to respond" : "Service unavailable" },
    { status: timedOut ? 504 : 502 },
  );
}

export async function currentUser(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const res = await backendFetch("auth/me", {
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => null);
  return res?.ok ? ((await res.json()) as User) : null;
}
