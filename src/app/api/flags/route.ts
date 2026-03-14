import { NextResponse } from "next/server";
import { getFlags, setFlags } from "@/lib/flags";
import { logger } from "@/lib/logger";

/**
 * GET /api/flags
 * Authorization: Bearer <firebase_id_token>
 *
 * Returns all feature flags for the authenticated user.
 * Falls back to FLAG_DEFAULTS if no flags have been saved yet.
 *
 * PATCH /api/flags
 * Authorization: Bearer <firebase_id_token>
 * Body: { flagName: boolean, ... }
 *
 * Updates one or more feature flags. Merges with existing values.
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
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    try {
        const flags = await getFlags(uid, idToken);
        logger.info("api/flags", "Flags read", { uid });
        return NextResponse.json({ flags });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("api/flags", "Failed to read flags", { error: msg });
        return NextResponse.json({ error: "read_failed" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    // Only accept boolean values
    const updates: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(body)) {
        if (typeof value === "boolean") {
            updates[key] = value;
        }
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "no_valid_updates" }, { status: 400 });
    }

    try {
        await setFlags(uid, updates, idToken);
        logger.info("api/flags", "Flags updated", { uid, updates });
        return NextResponse.json({ ok: true, updated: updates });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("api/flags", "Failed to update flags", { error: msg });
        return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
}
