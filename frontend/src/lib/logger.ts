// Structured logger (pino) used instead of console in app code.
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "warn" : "info",
  browser: { asObject: true },
});
