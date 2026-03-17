import { NextResponse } from "next/server";
import { routeQuery } from "@/lib/ai-router";
import { logger } from "@/lib/logger";
import { scrubText, restoreText } from "@/lib/pii-scrubber";

/**
 * POST /api/ai/query
 * Authorization: Bearer <firebase_id_token>
 * Body: { query: string }
 *
 * Classifies the query and routes it:
 *   - "simple"  → returns { type: "simple" } so the client can answer from local data
 *   - "complex" → calls Gemini and returns { type: "complex", answer: string }
 *
 * This endpoint is the single entry point for all AI-powered queries.
 * Routing decisions are always logged for cost monitoring.
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY ?? "";
const GEMINI_API_URL   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function verifyIdToken(idToken: string): Promise<string | null> {
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ localId: string }> };
    return data.users?.[0]?.localId ?? null;
}

async function callGemini(query: string): Promise<string> {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const res = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: query }] }],
        }),
    });

    if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
        candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
        }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: { query?: string };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const query = body.query?.trim();
    if (!query) {
        return NextResponse.json({ error: "query_required" }, { status: 400 });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    // Classify and log routing decision
    const { type, reason } = routeQuery({ query, caller: "api/ai/query", uid });

    if (type === "simple") {
        // Simple queries are answered client-side from local/Firestore data.
        // Return the classification so the caller can handle it without an AI call.
        return NextResponse.json({ type: "simple", reason });
    }

    // --- PII scrubbing (privacy boundary) ---
    // Scrub the query before sending to Gemini.
    // mapping is scoped here and NEVER logged, stored, or returned.
    let anonymizedQuery = query;
    let mapping = {};
    try {
        if (query.trim()) {
            const r = scrubText(query);
            anonymizedQuery = r.anonymized;
            mapping = r.mapping;
        }
    } catch (scrubErr) {
        console.warn("ai/query: pii-scrubber failed, using original query", scrubErr);
        anonymizedQuery = query;
        mapping = {};
    }
    // -----------------------------------------

    // Complex queries: invoke Gemini
    try {
        const rawAnswer = await callGemini(anonymizedQuery);
        // Restore PII placeholders → real values before returning to the client
        const answer = restoreText(rawAnswer, mapping);
        logger.info("ai/query", "AI query answered", { uid, queryLength: query.length });
        // mapping is intentionally excluded from the response
        return NextResponse.json({ type: "complex", answer });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("ai/query", "AI call failed", { error: msg, uid });
        return NextResponse.json({ error: "ai_call_failed", detail: msg }, { status: 502 });
    }
}
