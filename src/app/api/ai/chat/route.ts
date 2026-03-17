import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { scrubText, restoreText } from "@/lib/pii-scrubber";

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

interface ChatRequestBody {
    messages: ChatMessage[];
    /** Optional live data context injected by the client from enabled integrations */
    context?: string;
}

/**
 * POST /api/ai/chat
 * Body: { messages: ChatMessage[] }
 * Response: { reply: string }
 *
 * Stateless chat endpoint — caller sends full conversation history.
 * Uses OpenAI gpt-4o-mini with a Nexaro-aware system prompt.
 */
export async function POST(request: Request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "OPENAI_API_KEY is not configured." },
            { status: 500 },
        );
    }

    let body: ChatRequestBody;
    try {
        body = (await request.json()) as ChatRequestBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return NextResponse.json({ error: "messages array is required." }, { status: 400 });
    }

    // --- PII scrubbing (privacy boundary) ---
    // body.context contains live email/calendar data from integrations — scrub before sending to OpenAI.
    // mapping is scoped here and NEVER logged, stored, or returned.
    let contextForLLM = body.context?.trim() ?? "";
    let mapping = {};
    try {
        if (contextForLLM) {
            const r = scrubText(contextForLLM);
            contextForLLM = r.anonymized;
            mapping = r.mapping;
        }
    } catch (scrubErr) {
        console.warn("ai/chat: pii-scrubber failed, using original context", scrubErr);
        contextForLLM = body.context?.trim() ?? "";
        mapping = {};
    }
    // -----------------------------------------

    const contextSection = contextForLLM
        ? `\n\n---\n## Live Data from User's Integrations\nThe following real data was fetched from the user's connected accounts. Use it to give accurate, personalized answers.\n\n${contextForLLM}\n---`
        : "";

    const systemMessage: ChatMessage = {
        role: "system",
        content: `You are Nexaro AI, a personal executive assistant embedded in the Nexaro unified inbox.
You help CEOs manage their communication, prioritize decisions, draft messages, and think through complex topics.
Be concise, professional, and direct. Format responses with markdown when helpful (bullet points, bold text).
Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.${contextSection}`,
    };

    const messages = [systemMessage, ...body.messages];

    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages,
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            logger.error("ai/chat", "OpenAI API error", { status: res.status, body: errText.slice(0, 300) });
            return NextResponse.json(
                { error: "AI generation failed. Please try again." },
                { status: 502 },
            );
        }

        const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
        };

        const rawReply = data.choices?.[0]?.message?.content?.trim() ?? "";

        if (!rawReply) {
            return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
        }

        // Restore PII placeholders → real values before returning to the client
        const reply = restoreText(rawReply, mapping);

        logger.info("ai/chat", "Chat reply generated", { turns: body.messages.length });
        // mapping is intentionally excluded from the response
        return NextResponse.json({ reply });
    } catch (err: unknown) {
        logger.error("ai/chat", "Unexpected error", { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
