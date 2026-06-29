/**
 * Logger
 *
 * Structured console logger. Outputs JSON for easy parsing by log aggregators
 * (Datadog, CloudWatch, etc.) in production.
 *
 * In production, swap this for Pino or Winston by changing this file only —
 * callers import from @/lib/logger and are unaffected.
 */

type LogLevel = "info" | "warn" | "error" | "debug"

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  [key: string]: unknown
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  }
  const output = JSON.stringify(entry)
  if (level === "error" || level === "warn") {
    console.error(output)
  } else {
    console.log(output)
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
}