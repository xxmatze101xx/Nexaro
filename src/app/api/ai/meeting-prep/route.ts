import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/ai/meeting-prep
 * Authorization: Bearer <firebase_id_token>
 *
 * Generates a structured meeting briefing for an upcoming calendar event.
 * Uses recent relevant message excerpts (passed by client) as context.
 *
 * Body: {
 *   title: string;
 *   attendees: string[];
 *   startTime: string; // ISO
 *   description?: string;
 *   messageExcerpts: Array<{ sender, subject, snippet, timestamp }>;
 * }
 *
 * Response: { briefing: string }
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

interface MessageExcerpt {
    sender: string;
    subject: string;
    snippet: string;
    timestamp: string;
}

interface MeetingPrepBody {
    title: string;
    attendees: string[];
    startTime: string;
    description?: string;
    messageExcerpts: MessageExcerpt[];
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

    let body: MeetingPrepBody;
    try {
        body = (await request.json()) as MeetingPrepBody;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!body.title?.trim()) {
        return NextResponse.json({ error: "title_required" }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
        return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const meetingTime = new Date(body.startTime).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

    const attendeeList =
        body.attendees.length > 0 ? body.attendees.join(", ") : "No attendees listed";

    const messagesSection =
        body.messageExcerpts.length > 0
            ? body.messageExcerpts
                  .slice(0, 8)
                  .map(
                      m =>
                          `From: ${m.sender}\nSubject: ${m.subject}\nDate: ${new Date(m.timestamp).toLocaleDateString("en-US")}\n${m.snippet.slice(0, 300)}`,
                  )
                  .join("\n\n---\n\n")
            : "No recent relevant communications found.";

    const systemPrompt = `You are an executive assistant preparing a CEO for an upcoming meeting. Generate a concise, actionable meeting briefing based on the provided context.

Format your response with these exact section headers:

DISCUSSION TOPICS:
- (bullet points of likely agenda items based on meeting title, attendees, and recent communications)

PREVIOUS DECISIONS:
- (commitments, decisions, or open action items from recent communications — or "None found" if nothing relevant)

IMPORTANT CONTEXT:
- (key background information, relationship notes, or open issues to be aware of)

Keep the entire briefing under 300 words. Be specific and actionable. Focus on what the CEO needs to know right before walking into this meeting.`;

    const userPrompt = `MEETING: ${body.title}
TIME: ${meetingTime}
ATTENDEES: ${attendeeList}${body.description ? `\nDESCRIPTION: ${body.description}` : ""}

RECENT RELEVANT COMMUNICATIONS:
${messagesSection}`;

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
                max_tokens: 600,
                temperature: 0.4,
            }),
        });

        if (!groqRes.ok) {
            const errText = await groqRes.text();
            logger.error("ai/meeting-prep", "Groq API error", {
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

        logger.info("ai/meeting-prep", "Briefing generated", {
            uid,
            meeting: body.title.slice(0, 50),
            attendees: body.attendees.length,
            excerpts: body.messageExcerpts.length,
        });

        return NextResponse.json({ briefing });
    } catch (err: unknown) {
        logger.error("ai/meeting-prep", "Unexpected error", {
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
