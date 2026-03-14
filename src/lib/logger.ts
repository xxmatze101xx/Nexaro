/**
 * logger.ts — Server-side structured logger for Nexaro API routes.
 *
 * Outputs structured log lines to stdout/stderr (captured by Vercel logs).
 * Format: [LEVEL] [service] message {"key":"value",...}
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("slack/callback", "Token stored", { uid, team });
 *   logger.warn("ai/draft", "Empty response from AI");
 *   logger.error("gmail/refresh", "Token refresh failed", { status: 401 });
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    service: string;
    message: string;
    context?: Record<string, unknown>;
}

function emit(level: LogLevel, service: string, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        service,
        message,
        ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };

    const ctxStr = entry.context ? " " + JSON.stringify(entry.context) : "";
    const line = `[${level.toUpperCase()}] [${service}] ${message}${ctxStr}`;

    if (level === "error") {
        console.error(line);
    } else if (level === "warn") {
        console.warn(line);
    } else {
        console.log(line);
    }
}

export const logger = {
    info(service: string, message: string, context?: Record<string, unknown>): void {
        emit("info", service, message, context);
    },
    warn(service: string, message: string, context?: Record<string, unknown>): void {
        emit("warn", service, message, context);
    },
    error(service: string, message: string, context?: Record<string, unknown>): void {
        emit("error", service, message, context);
    },
};
