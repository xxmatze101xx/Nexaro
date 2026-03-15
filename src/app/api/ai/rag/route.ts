import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/ai/rag
 * Authorization: Bearer <firebase_id_token>
 * Body: { question: string; limit?: number }
 *
 * Retrieval-Augmented Generation: answers a user's question using their
 * own messages as context.
 *
 * Pipeline:
 *   1. Embed the question using OpenAI text-embedding-3-small
 *   2. Fetch stored embeddings from users/{uid}/embeddings
 *   3. Rank by cosine similarity, take top N
 *   4. Use their contextSnippets + metadata as AI context
 *   5. Call Groq (llama-3.3-70b-versatile) with question + context
 *   6. Return { answer, sources }
 *
 * Graceful degradation:
 *   - If no OpenAI key → returns { fallback: true }
 *   - If no embeddings stored → returns { fallback: true }
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY ?? "";
const GROQ_API_KEY     = process.env.GROQ_API_KEY ?? "";
const FIRESTORE_BASE   = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const DEFAULT_LIMIT       = 5;
const SIMILARITY_THRESHOLD = 0.45;

// ── Auth ───────────────────────────────────────────────────────────────────

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

// ── Embedding ──────────────────────────────────────────────────────────────

async function embedText(text: string): Promise<number[] | null> {
    if (!OPENAI_API_KEY) return null;
    const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ input: text.slice(0, 8000), model: "text-embedding-3-small" }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    return data.data?.[0]?.embedding ?? null;
}

// ── Vector math ────────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot   += a[i]! * b[i]!;
        normA += a[i]! * a[i]!;
        normB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

// ── Firestore embedding fetch ──────────────────────────────────────────────

interface StoredEmbedding {
    messageId: string;
    source: string;
    subject: string;
    sender: string;
    contextSnippet: string;
    messageTimestamp: string;
    vector: number[];
}

async function fetchEmbeddings(uid: string, idToken: string): Promise<StoredEmbedding[]> {
    const res = await fetch(
        `${FIRESTORE_BASE}/users/${uid}/embeddings?pageSize=500`,
        { headers: { Authorization: `Bearer ${idToken}` } },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
        documents?: Array<{
            fields?: Record<string, { stringValue?: string; integerValue?: string }>;
        }>;
    };

    return (data.documents ?? []).flatMap(doc => {
        const f = doc.fields;
        if (!f) return [];
        const embeddingJson = f["embeddingJson"]?.stringValue;
        const messageId = f["messageId"]?.stringValue ?? "";
        if (!embeddingJson || !messageId) return [];
        try {
            const vector = JSON.parse(embeddingJson) as number[];
            if (!Array.isArray(vector) || vector.length === 0) return [];
            return [{
                messageId,
                source: f["source"]?.stringValue ?? "",
                subject: f["subject"]?.stringValue ?? "",
                sender: f["sender"]?.stringValue ?? "",
                contextSnippet: f["contextSnippet"]?.stringValue ?? "",
                messageTimestamp: f["messageTimestamp"]?.stringValue ?? "",
                vector,
            }];
        } catch {
            return [];
        }
    });
}

// ── Context formatter ──────────────────────────────────────────────────────

function formatContext(messages: Array<StoredEmbedding & { score: number }>): string {
    return messages
        .map((m, i) => {
            const date = m.messageTimestamp
                ? new Date(m.messageTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "unknown date";
            const subject = m.subject ? `Subject: ${m.subject}` : "";
            const from = m.sender ? `From: ${m.sender}` : "";
            const meta = [from, subject, `Source: ${m.source}`, `Date: ${date}`].filter(Boolean).join(" | ");
            return `[${i + 1}] ${meta}\n${m.contextSnippet}`;
        })
        .join("\n\n---\n\n");
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: { question?: string; limit?: number };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const question = body.question?.trim();
    if (!question) {
        return NextResponse.json({ error: "question_required" }, { status: 400 });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    const limit = Math.min(body.limit ?? DEFAULT_LIMIT, 10);

    // 1. Embed the question
    const queryVector = await embedText(question);
    if (!queryVector) {
        logger.warn("ai/rag", "OpenAI embeddings unavailable — RAG fallback", { uid });
        return NextResponse.json({ fallback: true, reason: "embeddings_unavailable" });
    }

    // 2. Fetch stored embeddings
    const stored = await fetchEmbeddings(uid, idToken);
    if (stored.length === 0) {
        logger.info("ai/rag", "No embeddings stored — RAG fallback", { uid });
        return NextResponse.json({ fallback: true, reason: "no_embeddings" });
    }

    // 3. Rank by cosine similarity
    const ranked = stored
        .map(e => ({ ...e, score: cosineSimilarity(queryVector, e.vector) }))
        .filter(e => e.score >= SIMILARITY_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    if (ranked.length === 0) {
        logger.info("ai/rag", "No relevant context found for question", { uid, question: question.slice(0, 60) });
        return NextResponse.json({ fallback: true, reason: "no_relevant_context" });
    }

    // 4. Build context and generate answer
    const context = formatContext(ranked);

    const systemPrompt = `You are a personal AI assistant for a CEO using Nexaro, their unified communications inbox.
You have access to relevant excerpts from their emails, Slack messages, and Teams messages.

Rules:
- Answer the question based ONLY on the provided context messages.
- Be concise (2-4 sentences max unless the answer requires more detail).
- Reference specific messages when relevant (e.g., "In your email from Alex on March 12...").
- If the context doesn't contain enough information to answer, say so clearly.
- Do NOT hallucinate facts not present in the context.`;

    const userPrompt = `Question: ${question}

Relevant messages from your inbox:

${context}`;

    if (!GROQ_API_KEY) {
        return NextResponse.json({ fallback: true, reason: "groq_unavailable" });
    }

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
        const errText = await groqRes.text().catch(() => "");
        logger.error("ai/rag", "Groq API error", { uid, status: groqRes.status, body: errText.slice(0, 200) });
        return NextResponse.json({ error: "ai_generation_failed" }, { status: 502 });
    }

    const groqData = (await groqRes.json()) as {
        choices?: { message?: { content?: string } }[];
    };
    const answer = groqData.choices?.[0]?.message?.content?.trim() ?? "";

    if (!answer) {
        return NextResponse.json({ error: "ai_empty_response" }, { status: 502 });
    }

    const sources = ranked.map(m => ({
        messageId: m.messageId,
        subject: m.subject,
        sender: m.sender,
        source: m.source,
        timestamp: m.messageTimestamp,
        score: Math.round(m.score * 100) / 100,
    }));

    logger.info("ai/rag", "RAG answer generated", {
        uid,
        question: question.slice(0, 60),
        sourcesUsed: sources.length,
    });

    return NextResponse.json({ answer, sources });
}
