/**
 * privacy.ts — Privacy Enforcement Layer for Nexaro.
 *
 * POLICY: Full message bodies must never be permanently stored in Firestore.
 * Only the following may persist:
 *   - Embeddings (vector arrays)
 *   - Metadata (sender, subject, timestamp, labels, importance_score, status)
 *   - AI summaries / extracted action items / decision detections
 *   - Short previews (≤ MAX_PREVIEW_LENGTH characters)
 *
 * This module provides:
 *   validateForStorage(data, context)  — scans for private fields, returns violations
 *   sanitizeForStorage(data, context)  — strips private fields, logs violations
 *   sanitizeMessageForStorage(msg)     — converts UnifiedMessage → StorableMessage
 *   sanitizeJobPayload(payload)        — strips body fields from job input/output
 *
 * Usage pattern:
 *   // Before any Firestore write:
 *   const safe = sanitizeForStorage(data, "users/uid/collection/doc");
 *   await firestoreWrite(safe);
 */

import { logger } from "./logger";
import type { UnifiedMessage } from "./normalizers/types";
import type { MessageSource, MessageStatus } from "./normalizers/types";

// ── Policy constants ──────────────────────────────────────────────────────────

/** Maximum allowed length for preview/snippet fields stored in Firestore. */
export const MAX_PREVIEW_LENGTH = 200;

/**
 * Field names that must NEVER be persisted to Firestore.
 * These keys are matched case-insensitively anywhere in the object tree.
 */
export const PRIVATE_FIELDS: ReadonlySet<string> = new Set([
    "htmlcontent",       // Full decoded HTML email body
    "body",              // Raw text body (job inputs, AI prompts)
    "rawbody",           // Any raw body variant
    "messagebody",       // Any message body variant
    "textcontent",       // Full text content
    "fulltext",          // Full text variant
    // Note: "text" (Slack message text) is allowed as short preview,
    // but is sanitized to MAX_PREVIEW_LENGTH before storage.
    // Note: "preview" is allowed but must be ≤ MAX_PREVIEW_LENGTH.
    // Note: "messages" arrays in job inputs are stripped (contain full bodies).
]);

// ── Violation types ───────────────────────────────────────────────────────────

export interface PrivacyViolation {
    field: string;
    path: string;
    valueLength: number;
}

export interface ValidationResult {
    isClean: boolean;
    violations: PrivacyViolation[];
}

// ── StorableMessage — safe subset of UnifiedMessage ───────────────────────────

/**
 * A UnifiedMessage stripped of all full body content.
 * Safe to write to Firestore.
 */
export interface StorableMessage {
    id: string;
    source: MessageSource;
    sender: string;
    timestamp: string;
    threadId: string;
    /** Truncated to MAX_PREVIEW_LENGTH — NOT the full body. */
    preview: string;
    metadata: {
        subject?: string;
        senderEmail?: string;
        accountId?: string;
        labels?: string[];
        rfcMessageId?: string;
        importance_score?: number;
        status?: MessageStatus;
        external_id?: string;
        channelId?: string;
        channelName?: string;
        // htmlContent is intentionally ABSENT
        // ai_draft_response is intentionally ABSENT (contains model-generated text, not summary)
    };
}

// ── Core validation ───────────────────────────────────────────────────────────

/**
 * Deep-scans an object for privacy violations (fields that must not be stored).
 * Does NOT modify the object — call sanitizeForStorage to get a clean copy.
 */
export function validateForStorage(
    data: unknown,
    context: string,
    _path = "",
): ValidationResult {
    const violations: PrivacyViolation[] = [];
    scanForViolations(data, context, _path, violations);
    return { isClean: violations.length === 0, violations };
}

function scanForViolations(
    value: unknown,
    context: string,
    path: string,
    violations: PrivacyViolation[],
): void {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
        value.forEach((item, i) => scanForViolations(item, context, `${path}[${i}]`, violations));
        return;
    }

    if (typeof value === "object") {
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
            const fieldPath = path ? `${path}.${key}` : key;
            const keyLower = key.toLowerCase();

            if (PRIVATE_FIELDS.has(keyLower)) {
                const strLen = typeof val === "string" ? val.length : JSON.stringify(val ?? "").length;
                violations.push({ field: key, path: fieldPath, valueLength: strLen });
                continue; // don't recurse into private fields
            }

            // Preview fields must be ≤ MAX_PREVIEW_LENGTH
            if ((keyLower === "preview" || keyLower === "snippet") && typeof val === "string" && val.length > MAX_PREVIEW_LENGTH) {
                violations.push({ field: key, path: fieldPath, valueLength: val.length });
                continue;
            }

            scanForViolations(val, context, fieldPath, violations);
        }
    }
}

// ── Core sanitizer ────────────────────────────────────────────────────────────

/**
 * Returns a deep copy of `data` with all private fields removed.
 * Logs a warning for each violation found.
 */
export function sanitizeForStorage<T>(data: T, context: string): T {
    const { violations } = validateForStorage(data, context);

    if (violations.length > 0) {
        logger.warn("privacy", "Storage violation detected — stripping private fields", {
            context,
            violations: violations.map(v => `${v.path}(${v.valueLength}chars)`),
        });
    }

    return deepStrip(data) as T;
}

function deepStrip(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (Array.isArray(value)) {
        return value.map(deepStrip);
    }

    if (typeof value === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
            const keyLower = key.toLowerCase();

            if (PRIVATE_FIELDS.has(keyLower)) {
                // Replace with null rather than deleting — keeps schema predictable
                result[key] = null;
                continue;
            }

            // Truncate oversized preview / snippet fields
            if ((keyLower === "preview" || keyLower === "snippet") && typeof val === "string") {
                result[key] = val.slice(0, MAX_PREVIEW_LENGTH);
                continue;
            }

            result[key] = deepStrip(val);
        }
        return result;
    }

    return value;
}

// ── Message-specific sanitizer ────────────────────────────────────────────────

/**
 * Converts a full UnifiedMessage (with potentially large htmlContent)
 * into a StorableMessage safe for Firestore persistence.
 */
export function sanitizeMessageForStorage(msg: UnifiedMessage): StorableMessage {
    const { violations } = validateForStorage(msg, `message:${msg.id}`);

    if (violations.length > 0) {
        logger.warn("privacy", "UnifiedMessage contains private fields — sanitizing before storage", {
            messageId: msg.id,
            source: msg.source,
            violations: violations.map(v => v.path),
        });
    }

    return {
        id: msg.id,
        source: msg.source,
        sender: msg.sender,
        timestamp: msg.timestamp,
        threadId: msg.threadId,
        preview: msg.preview.slice(0, MAX_PREVIEW_LENGTH),
        metadata: {
            subject: msg.metadata.subject,
            senderEmail: msg.metadata.senderEmail,
            accountId: msg.metadata.accountId,
            labels: msg.metadata.labels,
            rfcMessageId: msg.metadata.rfcMessageId,
            importance_score: msg.metadata.importance_score,
            status: msg.metadata.status,
            external_id: msg.metadata.external_id,
            channelId: msg.metadata.channelId,
            channelName: msg.metadata.channelName,
            // htmlContent: intentionally excluded
            // ai_draft_response: intentionally excluded
        },
    };
}

// ── Job-specific sanitizer ────────────────────────────────────────────────────

/**
 * Strips full message body fields from a job input or output payload
 * before it is written (or kept) in Firestore.
 *
 * Called:
 *   - On job INPUT before permanent storage (input is cleared after processing)
 *   - On job OUTPUT to ensure summaries don't accidentally re-embed full bodies
 */
export function sanitizeJobPayload(
    payload: Record<string, unknown>,
    context: string,
): Record<string, unknown> {
    const { violations } = validateForStorage(payload, context);

    if (violations.length > 0) {
        logger.warn("privacy", "Job payload contains private fields", {
            context,
            count: violations.length,
            fields: violations.map(v => v.path),
        });
    }

    // Strip the messages array (contains full body objects) and direct body fields
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
        const keyLower = key.toLowerCase();

        if (PRIVATE_FIELDS.has(keyLower)) {
            sanitized[key] = null;
            continue;
        }

        // Strip message arrays (contain full body text in job inputs)
        if (keyLower === "messages" && Array.isArray(value)) {
            // Replace the full message array with just count (for audit purposes)
            sanitized["_messageCount"] = value.length;
            sanitized[key] = null;
            continue;
        }

        // Truncate string fields that look like body text (> MAX_PREVIEW_LENGTH)
        if (typeof value === "string" && value.length > MAX_PREVIEW_LENGTH) {
            const safe = value.slice(0, MAX_PREVIEW_LENGTH) + "…[truncated]";
            sanitized[key] = safe;
            continue;
        }

        sanitized[key] = value;
    }

    return sanitized;
}

// ── Convenience: log-only validation (no mutation) ────────────────────────────

/**
 * Validates data and logs any violations without modifying it.
 * Use for audit checks where you don't want to change the data.
 */
export function auditForStorage(data: unknown, context: string): boolean {
    const { isClean, violations } = validateForStorage(data, context);
    if (!isClean) {
        logger.error("privacy", "Privacy audit FAILED — data contains private fields", {
            context,
            violationCount: violations.length,
            violations: violations.map(v => `${v.path}(${v.valueLength}chars)`),
        });
    }
    return isClean;
}
