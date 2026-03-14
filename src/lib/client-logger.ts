/**
 * client-logger.ts — Client-side structured logger for Nexaro browser code.
 *
 * Logs to the browser console AND persists error/warn entries to Firestore
 * via the /api/logs endpoint.
 *
 * Token setup: call setLoggerToken(idToken) after Firebase auth resolves,
 * so the logger can authenticate /api/logs writes.
 *
 * Usage:
 *   import { clientLogger, setLoggerToken } from "@/lib/client-logger";
 *   setLoggerToken(await user.getIdToken());
 *   clientLogger.error("sync", "Gmail sync failed", { error: "401" });
 *   clientLogger.warn("inbox", "No messages loaded");
 *   clientLogger.info("auth", "User signed in");
 */

export type ClientLogLevel = "info" | "warn" | "error";

// Module-level token store — set once after Firebase auth resolves.
let _idToken: string | null = null;

export function setLoggerToken(token: string | null): void {
    _idToken = token;
}

async function persist(
    level: ClientLogLevel,
    service: string,
    message: string,
    context?: Record<string, unknown>,
): Promise<void> {
    if (!_idToken) return;
    // Only persist warn/error to avoid Firestore write spam
    if (level === "info") return;

    try {
        await fetch("/api/logs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${_idToken}`,
            },
            body: JSON.stringify({ level, service, message, context }),
        });
    } catch {
        // Logging must never break the app — silently discard network errors.
    }
}

export const clientLogger = {
    info(service: string, message: string, context?: Record<string, unknown>): void {
        console.info(`[INFO] [${service}] ${message}`, context ?? "");
        void persist("info", service, message, context);
    },

    warn(service: string, message: string, context?: Record<string, unknown>): void {
        console.warn(`[WARN] [${service}] ${message}`, context ?? "");
        void persist("warn", service, message, context);
    },

    error(service: string, message: string, context?: Record<string, unknown>): void {
        console.error(`[ERROR] [${service}] ${message}`, context ?? "");
        void persist("error", service, message, context);
    },
};
