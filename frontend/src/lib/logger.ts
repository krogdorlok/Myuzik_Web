// Structured logger (pino) used instead of console in app code.
import pino from "pino";

export const logger = pino({ level: process.env.LOG_LEVEL ?? "info", browser: { asObject: true } });
