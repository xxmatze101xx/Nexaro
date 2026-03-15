import { NextResponse } from "next/server";
import { readUserMemory, writeUserMemory, recordInteractionSignal } from "@/lib/user-memory";
import type { MemoryInteractionSignal, UserMemoryProfile } from "@/lib/user-memory";
import { logger } from "@/lib/logger";

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

/**
 * GET /api/user/memory
 * Authorization: Bearer <firebase_id_token>
 * Returns the current user memory profile.
 */
export async function GET(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) return NextResponse.json({ error: "missing_auth" }, { status: 401 });

    const uid = await verifyIdToken(idToken);
    if (!uid) return NextResponse.json({ error: "auth_failed" }, { status: 401 });

    const profile = await readUserMemory(uid, idToken);
    return NextResponse.json({ profile });
}

/**
 * POST /api/user/memory
 * Authorization: Bearer <firebase_id_token>
 * Body:
 *   { signal: MemoryInteractionSignal }  — record an interaction, or
 *   { profile: Partial<UserMemoryProfile> } — explicit preference update
 *
 * Returns { profile } with the updated state.
 */
export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) return NextResponse.json({ error: "missing_auth" }, { status: 401 });

    const uid = await verifyIdToken(idToken);
    if (!uid) return NextResponse.json({ error: "auth_failed" }, { status: 401 });

    let body: { signal?: MemoryInteractionSignal; profile?: Partial<UserMemoryProfile> };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    try {
        if (body.signal) {
            // Record an interaction signal (e.g. reply sent, message engaged)
            await recordInteractionSignal(uid, idToken, body.signal);
            logger.info("user/memory", "Interaction signal recorded", { uid });
        } else if (body.profile) {
            // Explicit preference update (e.g. user manually sets tone)
            const current = await readUserMemory(uid, idToken);
            const updated: UserMemoryProfile = { ...current, ...body.profile, lastUpdated: new Date().toISOString() };
            await writeUserMemory(uid, idToken, updated);
            logger.info("user/memory", "Memory profile updated manually", { uid });
        } else {
            return NextResponse.json({ error: "Provide either 'signal' or 'profile' in body." }, { status: 400 });
        }

        const profile = await readUserMemory(uid, idToken);
        return NextResponse.json({ profile });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("user/memory", "Failed to update memory", { uid, error: msg });
        return NextResponse.json({ error: "Failed to update memory." }, { status: 500 });
    }
}
