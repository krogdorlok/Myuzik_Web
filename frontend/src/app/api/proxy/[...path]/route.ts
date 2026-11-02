import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, "GET");
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, "POST");
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, "DELETE");
}

async function proxyRequest(request: NextRequest, path: string[], method: string) {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  const url = new URL(path.join("/"), `${BACKEND_URL}/api/v1`);

  const headers = new Headers(request.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const body =
    method === "POST" && request.headers.get("content-type")?.includes("multipart")
      ? request.body
      : JSON.stringify(await request.json().catch(() => ({})));

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: method !== "GET" && method !== "DELETE" ? body : undefined,
  });

  if (!response.ok) {
    return NextResponse.json(await response.json().catch(() => ({ detail: "Request failed" })), {
      status: response.status,
    });
  }

  const responseHeaders = new Headers();
  if (token && response.headers.get("set-cookie")) {
    responseHeaders.set("set-cookie", response.headers.get("set-cookie")!);
  }

  return NextResponse.json(await response.json(), {
    status: response.status,
    headers: responseHeaders,
  });
}
