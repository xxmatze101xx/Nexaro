import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/search
 * Authorization: Bearer <firebase_id_token>
 * Body: { query: string; limit?: number }
 *
 * Semantic search over the user's message embeddings.
 * Steps:
 *   1. Embed the search query using OpenAI text-embedding-3-small
 *   2. Read all stored embeddings from users/{uid}/embeddings/* in Firestore
 *   3. Compute cosine similarity between query and each stored vector
 *   4. Return top-N message IDs ranked by similarity
 *
 * Response: { results: Array<{ messageId: string; score: number }> }
 *
 * Falls back to empty results if no embeddings exist or OpenAI key is absent.
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY ?? "";
const FIRESTORE_BASE   = `https://firestore.googleapis.com/v1/projects/${
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
}/databases/(default)/documents`;

const DEFAULT_LIMIT = 20;
const SIMILARITY_THRESHOLD = 0.5; // minimum cosine similarity to include in results

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
        body: JSON.stringify({
            input: text.slice(0, 8000),
            model: "text-embedding-3-small",
        }),
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

// ── Firestore embedding read ───────────────────────────────────────────────

interface FsDoc {
    name?: string;
    fields?: Record<string, { stringValue?: string; integerValue?: string }>;
}

async function fetchStoredEmbeddings(
    uid: string,
    idToken: string,
): Promise<Array<{ messageId: string; vector: number[] }>> {
    const res = await fetch(
        `${FIRESTORE_BASE}/users/${uid}/embeddings?pageSize=500`,
        { headers: { Authorization: `Bearer ${idToken}` } },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as { documents?: FsDoc[] };
    const results: Array<{ messageId: string; vector: number[] }> = [];

    for (const doc of data.documents ?? []) {
        const embeddingJson = doc.fields?.["embeddingJson"]?.stringValue;
        const messageId     = doc.fields?.["messageId"]?.stringValue ?? doc.name?.split("/").pop() ?? "";
        if (!embeddingJson || !messageId) continue;

        try {
            const vector = JSON.parse(embeddingJson) as number[];
            if (Array.isArray(vector) && vector.length > 0) {
                results.push({ messageId, vector });
            }
        } catch {
            // malformed embedding — skip
        }
    }

    return results;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: { query?: string; limit?: number };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const query = body.query?.trim();
    if (!query) {
        return NextResponse.json({ error: "query_required" }, { status: 400 });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    const limit = Math.min(body.limit ?? DEFAULT_LIMIT, 50);

    // 1. Embed the query
    const queryVector = await embedText(query);
    if (!queryVector) {
        logger.warn("search", "Embedding unavailable — returning empty results", { uid });
        return NextResponse.json({ results: [], fallback: true });
    }

    // 2. Load stored embeddings
    const stored = await fetchStoredEmbeddings(uid, idToken);
    if (stored.length === 0) {
        logger.info("search", "No embeddings stored yet", { uid });
        return NextResponse.json({ results: [], fallback: true });
    }

    // 3. Rank by cosine similarity
    const ranked = stored
        .map(({ messageId, vector }) => ({
            messageId,
            score: cosineSimilarity(queryVector, vector),
        }))
        .filter(r => r.score >= SIMILARITY_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    logger.info("search", "Semantic search complete", {
        uid,
        query: query.slice(0, 50),
        totalEmbeddings: stored.length,
        resultsReturned: ranked.length,
    });

    return NextResponse.json({ results: ranked });
}
