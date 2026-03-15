import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/ai/score
 * Authorization: Bearer <firebase_id_token>
 * Body: { subject: string; sender: string; preview: string; source: string }
 *
 * Uses Gemini to classify message importance as a 0–10 score.
 * Supplements the Python pipeline — call when messages lack a Python score.
 *
 * Response: { score: number }
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY ?? "";
const GEMINI_API_URL   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are an executive assistant scoring email/message importance for a CEO.
Rate the importance from 0 to 10 where:
- 9-10: Requires immediate attention (critical issues, board/investor/legal, urgent deadlines)
- 7-8:  High importance (key decisions, contracts, important meetings, escalations)
- 5-6:  Medium importance (follow-ups, project updates, approval requests)
- 3-4:  Low importance (FYIs, newsletters, routine updates)
- 0-2:  Minimal importance (marketing, spam, irrelevant notifications)

Respond with ONLY a single integer between 0 and 10. No explanation.`;

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

export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: { subject?: string; sender?: string; preview?: string; source?: string };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
    }

    const { subject = "", sender = "", preview = "", source = "" } = body;
    const prompt = `From: ${sender}\nSource: ${source}\nSubject: ${subject}\nPreview: ${preview.slice(0, 300)}`;

    try {
        const res = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 4, temperature: 0.1 },
            }),
        });

        if (!res.ok) {
            const err = await res.text().catch(() => "");
            logger.error("ai/score", "Gemini scoring failed", { status: res.status, error: err.slice(0, 100) });
            return NextResponse.json({ error: "ai_error" }, { status: 502 });
        }

        const data = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "5";
        const score = Math.max(0, Math.min(10, parseInt(raw, 10) || 5));

        logger.info("ai/score", "Message scored", { uid, score, source });
        return NextResponse.json({ score });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("ai/score", "Scoring error", { error: msg });
        return NextResponse.json({ error: "scoring_failed" }, { status: 500 });
    }
}
