// Authenticated pass-through to FastAPI: the httpOnly session cookie becomes a Bearer header server-side.
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { backendFetch, isSameOrigin, SESSION_COOKIE, upstreamError } from "@/lib/server/backend";

const FORWARD_HEADERS = ["accept", "content-type", "content-length"];
// Allow-list, not block-list: token-issuing endpoints stay unreachable here (they must go through /api/auth
// so the JWT lands in a cookie), and decoded segments can't smuggle "/" (e.g. auth%2Flogin) past the check.
const ROUTES =
  /^(predict|history(\/[0-9a-f-]{36})?|insights\/taste-profile|live\/ticket|auth\/me)$/;

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  if (!ROUTES.test(path) || params.path.some((s) => /[/\\%]/.test(s))) {
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  }
  if (request.method !== "GET" && !isSameOrigin(request)) {
    return NextResponse.json({ detail: "Cross-origin request blocked" }, { status: 403 });
  }

  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);

  try {
    const upstream = await backendFetch(`${path}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "DELETE" ? undefined : request.body,
      // @ts-expect-error -- Node fetch needs duplex for streamed request bodies; not yet in lib.dom types
      duplex: "half",
    });
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    return upstreamError(err);
  }
}

export { proxy as GET, proxy as POST, proxy as DELETE };
