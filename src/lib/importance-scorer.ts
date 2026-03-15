/**
 * importance-scorer.ts — Client-side message importance scorer for Nexaro.
 *
 * Produces a 0–10 importance score matching the Python pipeline's scale.
 * Used as a fallback when the Python-generated score is unavailable (score === 0
 * or not yet synced), and as a complement when blending signals.
 *
 * Scoring signals (all additive, capped at 10):
 *   1. Sender priority (VIP / known contact)          → up to 3 points
 *   2. Urgency keywords in subject/body               → up to 3 points
 *   3. Direct mention / reply / thread engagement     → up to 2 points
 *   4. Recency (messages from the last 2 hours)       → 1 point
 *   5. Source weight (email > chat for exec priority) → up to 1 point
 */

import type { Message } from "./mock-data";

// ── Configurable signal tables ─────────────────────────────────────────────

/**
 * VIP senders add full sender-priority points.
 * Populated from sender email patterns (lowercase prefix/domain match).
 * In production this would come from a user-configurable contact list.
 */
const VIP_PATTERNS: RegExp[] = [
    /\bboard\b/i,
    /\bceo\b/i,
    /\bcfo\b/i,
    /\bcto\b/i,
    /\binvestor\b/i,
    /\bpartner\b/i,
    /\bfounder\b/i,
    /\bvc\b/i,
    /\bpress\b/i,
    /\blegal\b/i,
    /\bcompliance\b/i,
];

const URGENCY_HIGH: RegExp[] = [
    /\burgent\b/i, /\bcritical\b/i, /\bimmediate(ly)?\b/i, /\basap\b/i,
    /\bdeadline\b/i, /\bsla\b/i, /\bescalat/i, /\bout?age\b/i,
    /\bbreached?\b/i, /\bfailed?\b/i, /\bdown\b/i, /\bblocking\b/i,
    /\baction required\b/i, /\bresponse required\b/i, /\btime.sensitive\b/i,
    /\btoday\b/i, /\bby eod\b/i, /\bby end of day\b/i,
];

const URGENCY_MEDIUM: RegExp[] = [
    /\bfyi\b/i, /\bimportant\b/i, /\bfollow.?up\b/i, /\breminder\b/i,
    /\bpriority\b/i, /\breviewed?\b/i, /\bapproval\b/i, /\bapprove\b/i,
    /\bdecision\b/i, /\bmeeting\b/i, /\bcall\b/i, /\blaunch\b/i,
    /\bcontract\b/i, /\binvoice\b/i, /\bpayment\b/i, /\bbudget\b/i,
];

/** Source weights: executive email platforms rank higher than chat */
const SOURCE_WEIGHTS: Partial<Record<Message["source"], number>> = {
    gmail:   1.0,
    outlook: 1.0,
    teams:   0.7,
    slack:   0.6,
    gcal:    0.5,
    proton:  1.0,
    apple:   0.9,
};

// ── Scoring functions ──────────────────────────────────────────────────────

function senderScore(message: Message): number {
    const senderText = `${message.sender} ${message.senderEmail ?? ""}`;
    for (const pattern of VIP_PATTERNS) {
        if (pattern.test(senderText)) return 3;
    }
    return 0;
}

function urgencyScore(message: Message): number {
    const text = `${message.subject ?? ""} ${message.content}`;

    for (const pattern of URGENCY_HIGH) {
        if (pattern.test(text)) return 3;
    }

    let count = 0;
    for (const pattern of URGENCY_MEDIUM) {
        if (pattern.test(text)) count++;
    }
    return Math.min(count, 2); // up to 2 for medium keywords
}

function engagementScore(message: Message): number {
    let score = 0;
    // Is a reply (Re: in subject)?
    if (/^re:/i.test(message.subject ?? "")) score += 1;
    // Has multiple participants (thread)?
    if (message.content.length > 500) score += 1;
    return Math.min(score, 2);
}

function recencyScore(message: Message): number {
    const ageMs = Date.now() - new Date(message.timestamp).getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    return ageMs < twoHoursMs ? 1 : 0;
}

function sourceScore(message: Message): number {
    const weight = SOURCE_WEIGHTS[message.source] ?? 0.5;
    return weight >= 1.0 ? 1 : weight >= 0.7 ? 0.5 : 0;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Computes a heuristic importance score for a message.
 * Returns a 0–10 float to match the Python pipeline's scale.
 */
export function computeHeuristicScore(message: Message): number {
    const raw =
        senderScore(message) +
        urgencyScore(message) +
        engagementScore(message) +
        recencyScore(message) +
        sourceScore(message);

    return Math.min(Math.round(raw * 10) / 10, 10);
}

/**
 * Returns the best available importance score for a message.
 * Prefers the Python-generated score from Firestore (already on message).
 * Falls back to the heuristic scorer if the stored score is 0 (unscored).
 *
 * @param message         - The message to score
 * @param firestoreScore  - Optional Python pipeline score override
 */
export function getDisplayScore(
    message: Message,
    firestoreScore?: number | null,
): number {
    const pythonScore = firestoreScore ?? message.importance_score;
    if (pythonScore > 0) return pythonScore;
    return computeHeuristicScore(message);
}
