// Receives Core Web Vitals beacons from real sessions and logs them as structured events.
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const NAMES = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);
const MAX_BYTES = 1024;

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return new NextResponse(null, { status: 413 });
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) return new NextResponse(null, { status: 413 });
  const text = new TextDecoder().decode(bytes);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const { name, value, rating, page } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof name === "string" &&
    NAMES.has(name) &&
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    logger.info(
      {
        vital: name,
        value,
        rating: typeof rating === "string" ? rating.slice(0, 20) : undefined,
        page: typeof page === "string" ? page.slice(0, 100) : undefined,
      },
      "web-vital",
    );
  }
  return new NextResponse(null, { status: 204 });
}
