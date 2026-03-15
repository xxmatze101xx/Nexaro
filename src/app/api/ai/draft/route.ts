import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { buildDraftReplySystemPrompt, buildDraftReplyUserPrompt } from "@/lib/ai/prompts";

interface DraftRequestBody {
    subject?: string;
    sender?: string;
    senderEmail?: string;
    body: string;
}

/**
 * POST /api/ai/draft
 *
 * Generates a reply draft using the Groq API (llama-3.3-70b-versatile).
 * Body: { subject?, sender?, senderEmail?, body }
 * Response: { draft: string }
 */
export async function POST(request: Request) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "GROQ_API_KEY is not configured." },
            { status: 500 }
        );
    }

    let body: DraftRequestBody;
    try {
        body = (await request.json()) as DraftRequestBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!body.body?.trim()) {
        return NextResponse.json({ error: "Message body is required." }, { status: 400 });
    }

    const systemPrompt = `You are a busy executive assistant. Write a concise, professional reply to the email the user provides.

Rules:
- Maximum 3 short paragraphs, ideally 2.
- Tone: professional yet friendly.
- Do NOT include a subject line or greeting header — start directly with the reply text.
- Do NOT add "Best regards" or a signature at the end.
- Keep it under 400 characters if possible.`;

    const from = body.senderEmail
        ? `${body.sender ?? ""} <${body.senderEmail}>`.trim()
        : (body.sender ?? "Unknown");

    const userPrompt = `From: ${from}
Subject: ${body.subject ?? "(no subject)"}

${body.body}`;

    try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                max_tokens: 400,
                temperature: 0.7,
            }),
        });

        if (!groqRes.ok) {
            const errText = await groqRes.text();
            logger.error("ai/draft", "Groq API error", { status: groqRes.status, body: errText.slice(0, 300) });
            return NextResponse.json(
                { error: "AI generation failed. Please try again." },
                { status: 502 }
            );
        }

        const groqData = (await groqRes.json()) as {
            choices?: { message?: { content?: string } }[];
        };

        const draft = groqData.choices?.[0]?.message?.content?.trim() ?? "";

        if (!draft) {
            logger.warn("ai/draft", "Groq returned empty response");
            return NextResponse.json(
                { error: "AI returned an empty response." },
                { status: 502 }
            );
        }

        logger.info("ai/draft", "Draft generated", { subject: body.subject ?? "(none)", length: draft.length });
        return NextResponse.json({ draft });
    } catch (err: unknown) {
        logger.error("ai/draft", "Unexpected error calling Groq API", { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
