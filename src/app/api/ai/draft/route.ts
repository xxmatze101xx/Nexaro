import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { readUserMemory, formatMemoryForPrompt } from "@/lib/user-memory";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

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

interface DraftRequestBody {
    subject?: string;
    sender?: string;
    senderEmail?: string;
    body: string;
    /** Optional: Firebase ID token for personalizing the draft with user memory */
    idToken?: string;
}

/**
 * POST /api/ai/draft
 * Authorization: Bearer <firebase_id_token>  (optional — enables memory injection)
 *
 * Generates a reply draft using the OpenAI API (gpt-4o-mini).
 * If authenticated, reads user memory to personalize tone and length.
 * Body: { subject?, sender?, senderEmail?, body }
 * Response: { draft: string }
 */
export async function POST(request: Request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "OPENAI_API_KEY is not configured." },
            { status: 500 }
        );
    }

    let draftBody: DraftRequestBody;
    try {
        draftBody = (await request.json()) as DraftRequestBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!draftBody.body?.trim()) {
        return NextResponse.json({ error: "Message body is required." }, { status: 400 });
    }

    // Load user memory if authenticated (best-effort — no failure if missing)
    const idToken = request.headers.get("Authorization")?.slice(7) ?? draftBody.idToken;
    let memoryHints = "";
    if (idToken) {
        try {
            const uid = await verifyIdToken(idToken);
            if (uid) {
                const memory = await readUserMemory(uid, idToken);
                memoryHints = formatMemoryForPrompt(memory);
            }
        } catch {
            // Memory injection is best-effort — don't block draft generation
        }
    }

    const systemPrompt = `You are a busy executive assistant. Write a concise, professional reply to the email the user provides.

Rules:
- Maximum 3 short paragraphs, ideally 2.
- Tone: professional yet friendly.
- Do NOT include a subject line or greeting header — start directly with the reply text.
- Do NOT add "Best regards" or a signature at the end.
- Keep it under 400 characters if possible.${memoryHints}`;

    const from = draftBody.senderEmail
        ? `${draftBody.sender ?? ""} <${draftBody.senderEmail}>`.trim()
        : (draftBody.sender ?? "Unknown");

    const userPrompt = `From: ${from}
Subject: ${draftBody.subject ?? "(no subject)"}

${draftBody.body}`;

    try {
        const groqRes = await fetch("https://api.openai.com/v1/chat/completions", {
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

        if (!groqRes.ok) {
            const errText = await groqRes.text();
            logger.error("ai/draft", "OpenAI API error", { status: groqRes.status, body: errText.slice(0, 300) });
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
            logger.warn("ai/draft", "OpenAI returned empty response");
            return NextResponse.json(
                { error: "AI returned an empty response." },
                { status: 502 }
            );
        }

        logger.info("ai/draft", "Draft generated", {
            subject: draftBody.subject ?? "(none)",
            length: draft.length,
            memoryInjected: memoryHints.length > 0,
        });
        return NextResponse.json({ draft });
    } catch (err: unknown) {
        logger.error("ai/draft", "Unexpected error calling OpenAI API", { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
