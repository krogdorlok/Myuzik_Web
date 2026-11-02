"use client";
// Beacons LCP/CLS/INP (and FCP/TTFB) from real sessions to /api/vitals without blocking unload.
import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals(({ name, value, rating }) => {
    navigator.sendBeacon(
      "/api/vitals",
      new Blob([JSON.stringify({ name, value, rating, page: location.pathname })], {
        type: "application/json",
      }),
    );
  });
  return null;
}
