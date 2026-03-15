import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/ai/briefing
 * Authorization: Bearer <firebase_id_token>
 *
 * Generates a daily executive briefing from the user's recent messages.
 * Analyzes priority topics, flags pending actions, and surfaces key context.
 *
 * Body: {
 *   date: string;  // ISO date string — used for logging
 *   messages: Array<{
 *     sender: string;
 *     subject: string;
 *     snippet: string;
 *     timestamp: string;
 *     source: string;
 *     importance_score: number;
 *   }>;
 * }
 *
 * Response: { briefing: string; generatedAt: string }
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

interface BriefingMessage {
    sender: string;
    subject: string;
    snippet: string;
    timestamp: string;
    source: string;
    importance_score: number;
}

interface BriefingBody {
    date: string;
    messages: BriefingMessage[];
}

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

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    let body: BriefingBody;
    try {
        body = (await request.json()) as BriefingBody;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return NextResponse.json({ error: "messages_required" }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
        return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    // Build context string — top 15 messages sorted by importance_score desc
    const top = [...body.messages]
        .sort((a, b) => b.importance_score - a.importance_score)
        .slice(0, 15);

    const messagesContext = top
        .map((m, i) => {
            const time = new Date(m.timestamp).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
            });
            return `${i + 1}. [${m.source.toUpperCase()} · ${time}] From: ${m.sender}\n   Subject: ${m.subject}\n   ${m.snippet.slice(0, 250)}`;
        })
        .join("\n\n");

    const dateLabel = new Date(body.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

    const systemPrompt = `You are an AI chief of staff preparing a concise daily briefing for a busy CEO. Analyze the incoming messages and produce a structured summary.

Format your response with exactly these section headers:

PRIORITY TOPICS:
(2-4 bullet points of the most important subjects requiring attention today)

PENDING ACTIONS:
(bullet points of decisions or tasks that need the CEO's response or action — use "None identified" if nothing urgent)

KEY CONTEXT:
(1-3 bullet points of important background info, emerging trends, or relationship notes from today's communications)

Rules:
- Be specific with names, numbers, and topics — avoid vague summaries
- Each bullet point must be one sentence maximum
- Total length: under 200 words
- Focus on what the CEO needs to ACT on, not just what happened`;

    const userPrompt = `Daily briefing for: ${dateLabel}
Total messages analyzed: ${body.messages.length}

TOP PRIORITY MESSAGES:
${messagesContext}`;

    try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                max_tokens: 500,
                temperature: 0.3,
            }),
        });

        if (!groqRes.ok) {
            const errText = await groqRes.text();
            logger.error("ai/briefing", "Groq API error", {
                status: groqRes.status,
                body: errText.slice(0, 300),
            });
            return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
        }

        const groqData = (await groqRes.json()) as {
            choices?: { message?: { content?: string } }[];
        };

        const briefing = groqData.choices?.[0]?.message?.content?.trim() ?? "";

        if (!briefing) {
            return NextResponse.json({ error: "AI returned empty response" }, { status: 502 });
        }

        const generatedAt = new Date().toISOString();

        logger.info("ai/briefing", "Daily briefing generated", {
            uid,
            date: body.date,
            messagesAnalyzed: body.messages.length,
            briefingLength: briefing.length,
        });

        return NextResponse.json({ briefing, generatedAt });
    } catch (err: unknown) {
        logger.error("ai/briefing", "Unexpected error", {
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
