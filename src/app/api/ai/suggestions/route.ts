import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/ai/suggestions
 *
 * Generates 3 varied reply suggestions for a message using the Groq API.
 * Each suggestion has a distinct style: concise, balanced, and detailed.
 *
 * Body: { subject?, sender?, senderEmail?, body }
 * Response: { suggestions: string[] }
 */

interface SuggestionsRequestBody {
    subject?: string;
    sender?: string;
    senderEmail?: string;
    body: string;
}

const STYLES = [
    {
        label: "concise",
        instruction: "Keep it under 60 words. One or two short sentences only.",
    },
    {
        label: "balanced",
        instruction: "2-3 short paragraphs. Balanced level of detail.",
    },
    {
        label: "detailed",
        instruction: "3 paragraphs with context. More thorough response.",
    },
];

async function generateOneSuggestion(
    apiKey: string,
    from: string,
    subject: string,
    body: string,
    style: typeof STYLES[number],
    memoryHints: string,
): Promise<string> {
    const systemPrompt = `You are a busy executive assistant. Write a ${style.label} professional reply to the email below.

Rules:
- ${style.instruction}
- Tone: professional yet friendly.
- Do NOT include a subject line or greeting header.
- Do NOT add a signature at the end.${memoryHints}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `From: ${from}\nSubject: ${subject}\n\n${body}` },
            ],
            max_tokens: 300,
            temperature: 0.7 + STYLES.indexOf(style) * 0.1,
        }),
    });

    if (!res.ok) return "";

    const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function POST(request: Request) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
    }

    let reqBody: SuggestionsRequestBody;
    try {
        reqBody = (await request.json()) as SuggestionsRequestBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!reqBody.body?.trim()) {
        return NextResponse.json({ error: "Message body is required." }, { status: 400 });
    }

    const memoryHints = "";

    const from = reqBody.senderEmail
        ? `${reqBody.sender ?? ""} <${reqBody.senderEmail}>`.trim()
        : (reqBody.sender ?? "Unknown");
    const subject = reqBody.subject ?? "(no subject)";

    try {
        const suggestions = await Promise.all(
            STYLES.map(style =>
                generateOneSuggestion(apiKey, from, subject, reqBody.body, style, memoryHints)
            )
        );

        const validSuggestions = suggestions.filter(Boolean);
        if (validSuggestions.length === 0) {
            return NextResponse.json({ error: "AI generation failed." }, { status: 502 });
        }

        logger.info("ai/suggestions", "Suggestions generated", {
            subject,
            count: validSuggestions.length,
            memoryInjected: memoryHints.length > 0,
        });

        return NextResponse.json({ suggestions: validSuggestions });
    } catch (err: unknown) {
        logger.error("ai/suggestions", "Unexpected error", { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
