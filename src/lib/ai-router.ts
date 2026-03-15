/**
 * ai-router.ts — AI Query Router for Nexaro.
 *
 * Classifies incoming queries and routes them to the cheapest handler:
 *   SIMPLE  → answered directly from Firestore data (no AI API call)
 *   COMPLEX → requires an AI model (Gemini)
 *
 * Simple query patterns (heuristics):
 *   - Count / list requests:  "how many", "count", "list", "show me all"
 *   - Single-field lookups:   "who sent", "sender of", "subject of"
 *   - Recency requests:       "latest", "newest", "most recent", "last"
 *   - Status checks:          "unread", "read", "archived"
 *
 * Anything that requires reasoning, summarisation, or synthesis → COMPLEX.
 *
 * Usage:
 *   const { type, reason } = classifyQuery(query);
 *   if (type === "simple") { ... use Firestore data ... }
 *   else                   { ... call AI API ... }
 */

import { logger } from "./logger";

export type QueryType = "simple" | "complex";

export interface QueryClassification {
    type: QueryType;
    /** Human-readable explanation of why this classification was chosen */
    reason: string;
}

// ── Heuristic rule tables ──────────────────────────────────────────────────

/** Keywords that strongly indicate a simple data-lookup query */
const SIMPLE_KEYWORDS = [
    "how many",
    "count",
    "list",
    "show me all",
    "show all",
    "who sent",
    "sender of",
    "subject of",
    "when did",
    "what time",
    "latest",
    "newest",
    "most recent",
    "last email",
    "last message",
    "unread",
    "archived",
    "from today",
    "today's",
    "yesterday's",
    "from yesterday",
    "last 24",
    "last 7 days",
    "this week",
    "is there",
    "are there",
    "do i have",
    "any messages",
    "any emails",
    "find email",
    "find message",
];

/** Keywords that strongly indicate a complex reasoning query */
const COMPLEX_KEYWORDS = [
    "summarize",
    "summarise",
    "summary",
    "explain",
    "draft",
    "write",
    "reply",
    "what should i",
    "what do you think",
    "analyze",
    "analyse",
    "analysis",
    "help me",
    "suggest",
    "recommend",
    "action items",
    "action points",
    "decisions",
    "insights",
    "context",
    "understand",
    "why did",
    "what does",
    "compare",
    "relationship",
    "trend",
    "pattern",
    "important",
    "priority",
    "urgent",
    "key points",
    "translate",
    "prepare",
    "briefing",
];

/** Maximum word count for a query to still be classified as simple */
const SIMPLE_MAX_WORDS = 8;

// ── Classifier ─────────────────────────────────────────────────────────────

/**
 * Classifies a query as "simple" (Firestore lookup) or "complex" (AI call).
 * Uses a multi-signal heuristic: keyword matching + query length.
 */
export function classifyQuery(query: string): QueryClassification {
    const normalized = query.toLowerCase().trim();
    const wordCount = normalized.split(/\s+/).length;

    // Complex keyword takes priority — these always require AI
    for (const kw of COMPLEX_KEYWORDS) {
        if (normalized.includes(kw)) {
            return {
                type: "complex",
                reason: `Contains complex keyword: "${kw}"`,
            };
        }
    }

    // Simple keyword match
    for (const kw of SIMPLE_KEYWORDS) {
        if (normalized.includes(kw)) {
            return {
                type: "simple",
                reason: `Contains simple lookup keyword: "${kw}"`,
            };
        }
    }

    // Short queries without complex keywords default to simple
    if (wordCount <= SIMPLE_MAX_WORDS) {
        return {
            type: "simple",
            reason: `Short query (${wordCount} words) with no complex keywords`,
        };
    }

    // Long queries with no simple keywords default to complex
    return {
        type: "complex",
        reason: `Long query (${wordCount} words) — routing to AI for reasoning`,
    };
}

// ── Router ─────────────────────────────────────────────────────────────────

export interface RouterInput {
    query: string;
    /** Caller identifier for logging (e.g. "chat", "search") */
    caller?: string;
    uid?: string;
}

export interface RouterResult {
    type: QueryType;
    reason: string;
}

/**
 * Routes a query and logs the decision. Call this before executing any AI call
 * to give the caller an opportunity to short-circuit with a Firestore query.
 *
 * Returns the classification so the caller can branch accordingly.
 */
export function routeQuery(input: RouterInput): RouterResult {
    const { query, caller = "unknown", uid } = input;
    const classification = classifyQuery(query);

    logger.info("ai-router", `Query routed to ${classification.type.toUpperCase()}`, {
        caller,
        uid,
        type: classification.type,
        reason: classification.reason,
        queryLength: query.length,
        wordCount: query.split(/\s+/).length,
    });

    return classification;
}
