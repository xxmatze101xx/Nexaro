import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { scrubText, restoreText } from "@/lib/pii-scrubber";

interface ComposeRequestBody {
    to?: string;
    subject?: string;
    hint?: string;
}

/**
 * POST /api/ai/compose
 *
 * Generates a new email draft using OpenAI (gpt-4o-mini).
 * Body: { to?, subject?, hint? }
 * Response: { body: string }
 */
export async function POST(request: Request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    let reqBody: ComposeRequestBody;
    try {
        reqBody = (await request.json()) as ComposeRequestBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { to, subject, hint } = reqBody;

    if (!subject?.trim() && !hint?.trim()) {
        return NextResponse.json({ error: "Subject or hint is required." }, { status: 400 });
    }

    // --- PII scrubbing (privacy boundary) ---
    // subject and hint may contain email content with sensitive data.
    // mapping is scoped here and NEVER logged, stored, or returned.
    let anonymizedSubject = subject ?? "";
    let anonymizedHint = hint ?? "";
    let mapping = {};
    try {
        if (subject?.trim()) {
            const r = scrubText(subject);
            anonymizedSubject = r.anonymized;
            mapping = { ...mapping, ...r.mapping };
        }
        if (hint?.trim()) {
            const r = scrubText(hint);
            anonymizedHint = r.anonymized;
            mapping = { ...mapping, ...r.mapping };
        }
    } catch (scrubErr) {
        console.warn("ai/compose: pii-scrubber failed, using original content", scrubErr);
        anonymizedSubject = subject ?? "";
        anonymizedHint = hint ?? "";
        mapping = {};
    }
    // -----------------------------------------

    const systemPrompt = `You are a professional executive assistant. Write a concise, professional email based on the provided context.

Rules:
- Maximum 3 short paragraphs, ideally 2.
- Tone: professional yet friendly.
- Start directly with the email body — no subject line, no greeting header.
- Do NOT add "Best regards" or a signature at the end.
- Keep it under 400 characters if possible.
- Write in the same language as the subject/hint.`;

    const parts: string[] = [];
    if (to) parts.push(`To: ${to}`);
    if (anonymizedSubject) parts.push(`Subject: ${anonymizedSubject}`);
    if (anonymizedHint) parts.push(`\nDraft so far / context:\n${anonymizedHint}`);

    const userPrompt = `Write an email with the following details:\n${parts.join("\n")}`;

    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                max_tokens: 400,
                temperature: 0.7,
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            logger.error("ai/compose", "OpenAI API error", { status: res.status, body: errText.slice(0, 300) });
            return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 502 });
        }

        const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
        };
        const rawBody = data.choices?.[0]?.message?.content?.trim() ?? "";

        if (!rawBody) {
            return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
        }

        // Restore PII placeholders → real values before returning to the client
        const body = restoreText(rawBody, mapping);

        logger.info("ai/compose", "Compose draft generated", { subject: subject ?? "(none)", length: body.length });
        // mapping is intentionally excluded from the response
        return NextResponse.json({ body });
    } catch (err: unknown) {
        logger.error("ai/compose", "Unexpected error", { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
