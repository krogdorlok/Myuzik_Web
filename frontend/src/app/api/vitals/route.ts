// Receives Core Web Vitals beacons from real sessions and logs them as structured events.
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const NAMES = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    value?: number;
    rating?: string;
    page?: string;
  } | null;
  if (body && NAMES.has(body.name ?? "") && typeof body.value === "number") {
    logger.info(
      { vital: body.name, value: body.value, rating: body.rating, page: body.page?.slice(0, 100) },
      "web-vital",
    );
  }
  return new NextResponse(null, { status: 204 });
}
