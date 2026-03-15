import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Decision Intelligence API
 *
 * GET  /api/decisions
 *   Lists stored decisions for the authenticated user.
 *   Response: { decisions: Decision[] }
 *
 * POST /api/decisions
 *   Analyzes a batch of messages with OpenAI to extract decisions,
 *   stores each one in Firestore at users/{uid}/decisions/{id},
 *   and returns the extracted decisions.
 *   Body: { messages: Array<{ id, sender, subject, content, source, timestamp }> }
 *   Response: { extracted: number; decisions: Decision[] }
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ── Types ────────────────────────────────────────────────────────────────────

export interface Decision {
    id: string;
    title: string;
    description: string;
    relatedMessageId: string;
    relatedSender: string;
    source: string;
    timestamp: string;
    extractedAt: string;
    status: "open" | "resolved";
}

interface InputMessage {
    id: string;
    sender: string;
    subject: string;
    content: string;
    source: string;
    timestamp: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

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

// ── Firestore helpers ─────────────────────────────────────────────────────────

interface FsDoc {
    name?: string;
    fields?: Record<string, { stringValue?: string; booleanValue?: boolean }>;
}

function docToDecision(doc: FsDoc): Decision | null {
    const f = doc.fields;
    if (!f) return null;
    const id = doc.name?.split("/").pop() ?? "";
    return {
        id,
        title: f.title?.stringValue ?? "",
        description: f.description?.stringValue ?? "",
        relatedMessageId: f.relatedMessageId?.stringValue ?? "",
        relatedSender: f.relatedSender?.stringValue ?? "",
        source: f.source?.stringValue ?? "",
        timestamp: f.timestamp?.stringValue ?? "",
        extractedAt: f.extractedAt?.stringValue ?? "",
        status: (f.status?.stringValue ?? "open") as Decision["status"],
    };
}

async function listDecisions(uid: string, idToken: string): Promise<Decision[]> {
    const url = `${FIRESTORE_BASE}/users/${uid}/decisions?pageSize=50`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) return [];

    const data = (await res.json()) as { documents?: FsDoc[] };
    return (data.documents ?? [])
        .map(docToDecision)
        .filter((d): d is Decision => d !== null && d.title.length > 0)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

async function saveDecision(
    uid: string,
    idToken: string,
    decision: Omit<Decision, "id">,
): Promise<string> {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const url = `${FIRESTORE_BASE}/users/${uid}/decisions/${id}`;
    await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
            fields: {
                title: { stringValue: decision.title },
                description: { stringValue: decision.description },
                relatedMessageId: { stringValue: decision.relatedMessageId },
                relatedSender: { stringValue: decision.relatedSender },
                source: { stringValue: decision.source },
                timestamp: { stringValue: decision.timestamp },
                extractedAt: { stringValue: decision.extractedAt },
                status: { stringValue: decision.status },
            },
        }),
    }).catch(() => {});
    return id;
}

// ── AI extraction ─────────────────────────────────────────────────────────────

interface RawDecision {
    title?: string;
    description?: string;
    relatedMessageIndex?: number;
}

async function extractDecisionsFromMessages(
    messages: InputMessage[],
): Promise<Array<RawDecision & { messageIndex: number }>> {
    if (!OPENAI_API_KEY || messages.length === 0) return [];

    const messageList = messages
        .map(
            (m, i) =>
                `[${i}] From: ${m.sender} | Source: ${m.source} | Date: ${new Date(m.timestamp).toLocaleDateString("en-US")}\nSubject: ${m.subject}\n${m.content.slice(0, 400)}`,
        )
        .join("\n\n---\n\n");

    const systemPrompt = `You are an AI system that detects important business decisions in communications.

Extract ONLY clear, significant decisions from the messages. A decision must be:
- Explicit (clearly stated, not speculative)
- Significant (budget, hiring, partnerships, strategic choices, project approvals, meeting outcomes)
- Actionable or already acted upon

Return a JSON array. Each element must have:
- "title": short decision title (max 10 words)
- "description": one sentence explaining the decision and its impact
- "relatedMessageIndex": index of the message containing this decision (0-based integer)

Return [] if no clear decisions are found. Return ONLY valid JSON, no other text.

Examples of valid decisions:
- "Budget approved for Q2 campaign"
- "Hired Sarah Chen as VP of Engineering"
- "Partnership agreement signed with Acme Corp"

NOT decisions:
- Questions, proposals still under discussion, casual mentions`;

    const userPrompt = `Analyze these ${messages.length} messages and extract business decisions:\n\n${messageList}`;

    try {
        const groqRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                max_tokens: 800,
                temperature: 0.1,
                response_format: { type: "json_object" },
            }),
        });

        if (!groqRes.ok) return [];

        const groqData = (await groqRes.json()) as {
            choices?: { message?: { content?: string } }[];
        };
        const raw = groqData.choices?.[0]?.message?.content?.trim() ?? "";

        // Parse — model might return { decisions: [...] } or [...]
        const parsed = JSON.parse(raw) as unknown;
        const arr: RawDecision[] = Array.isArray(parsed)
            ? (parsed as RawDecision[])
            : Array.isArray((parsed as { decisions?: RawDecision[] }).decisions)
              ? ((parsed as { decisions: RawDecision[] }).decisions)
              : [];

        return arr
            .filter(d => d.title && d.description)
            .map(d => ({ ...d, messageIndex: d.relatedMessageIndex ?? 0 }));
    } catch {
        return [];
    }
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const uid = await verifyIdToken(idToken);
    if (!uid) return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });

    const decisions = await listDecisions(uid, idToken);
    return NextResponse.json({ decisions });
}

export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const uid = await verifyIdToken(idToken);
    if (!uid) return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });

    let body: { messages: InputMessage[] };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return NextResponse.json({ error: "messages_required" }, { status: 400 });
    }

    const rawDecisions = await extractDecisionsFromMessages(body.messages.slice(0, 20));

    const extractedAt = new Date().toISOString();
    const saved: Decision[] = [];

    for (const raw of rawDecisions) {
        const src = body.messages[raw.messageIndex ?? 0];
        if (!src) continue;

        const id = await saveDecision(uid, idToken, {
            title: raw.title ?? "",
            description: raw.description ?? "",
            relatedMessageId: src.id,
            relatedSender: src.sender,
            source: src.source,
            timestamp: src.timestamp,
            extractedAt,
            status: "open",
        });

        saved.push({
            id,
            title: raw.title ?? "",
            description: raw.description ?? "",
            relatedMessageId: src.id,
            relatedSender: src.sender,
            source: src.source,
            timestamp: src.timestamp,
            extractedAt,
            status: "open",
        });
    }

    logger.info("decisions", "Decisions extracted", {
        uid,
        messagesAnalyzed: body.messages.length,
        decisionsFound: saved.length,
    });

    return NextResponse.json({ extracted: saved.length, decisions: saved });
}
