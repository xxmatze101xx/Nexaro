import { NextResponse } from "next/server";
import { readUserMemory, updateUserMemory } from "@/lib/user-memory";
import type { UserMemory } from "@/lib/user-memory";
import { logger } from "@/lib/logger";

/**
 * GET  /api/user/memory — Returns the authenticated user's stored preferences.
 * POST /api/user/memory — Updates user preferences (increments counters, sets explicit values).
 *
 * POST body:
 *   { regenerated?: boolean }          — user regenerated a draft
 *   { accepted?: boolean }             — user accepted a draft without regeneration
 *   { tone?: "formal"|"professional"|"casual" }
 *   { responseLength?: "short"|"medium"|"long" }
 */

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

export async function GET(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const uid = await verifyIdToken(idToken);
    if (!uid) return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });

    const memory = await readUserMemory(uid, idToken);
    return NextResponse.json({ memory: memory ?? {} });
}

export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let body: {
        regenerated?: boolean;
        accepted?: boolean;
        tone?: UserMemory["tone"];
        responseLength?: UserMemory["responseLength"];
    };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });

    const current = await readUserMemory(uid, idToken) ?? {};
    const updates: Partial<UserMemory> = {};

    if (body.regenerated) {
        updates.regenerationCount = (current.regenerationCount ?? 0) + 1;
    }
    if (body.accepted) {
        updates.acceptanceCount = (current.acceptanceCount ?? 0) + 1;
    }
    if (body.tone) updates.tone = body.tone;
    if (body.responseLength) updates.responseLength = body.responseLength;

    await updateUserMemory(uid, idToken, updates);
    logger.info("user/memory", "Memory updated", { uid, updates: Object.keys(updates) });

    return NextResponse.json({ ok: true });
}
