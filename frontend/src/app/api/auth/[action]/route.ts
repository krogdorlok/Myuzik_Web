// Login/register exchange credentials for a JWT and store it in an httpOnly cookie, so the token never reaches JS.
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  backendFetch,
  isSameOrigin,
  sessionCookie,
  SESSION_COOKIE,
  upstreamError,
} from "@/lib/server/backend";
import type { TokenResponse } from "@/types";

export async function POST(request: NextRequest, { params }: { params: { action: string } }) {
  // Same-origin + JSON-only stops login CSRF (a cross-site text/plain form planting the attacker's session).
  if (!isSameOrigin(request)) {
    return NextResponse.json({ detail: "Cross-origin request blocked" }, { status: 403 });
  }
  if (params.action === "logout") {
    cookies().delete(SESSION_COOKIE);
    return new NextResponse(null, { status: 204 });
  }
  if (params.action !== "login" && params.action !== "register") {
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ detail: "Expected JSON" }, { status: 415 });
  }

  let upstream: Response;
  try {
    upstream = await backendFetch(`auth/${params.action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    });
  } catch (err) {
    return upstreamError(err);
  }

  const body: unknown = await upstream.json().catch(() => ({ detail: "Request failed" }));
  if (!upstream.ok) return NextResponse.json(body, { status: upstream.status });

  const { access_token, user } = body as TokenResponse;
  cookies().set(SESSION_COOKIE, access_token, sessionCookie);
  return NextResponse.json({ user }, { status: upstream.status });
}
