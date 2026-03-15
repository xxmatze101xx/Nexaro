import { NextResponse } from "next/server";
import { deleteOldJobs } from "@/lib/jobs";
import { logger } from "@/lib/logger";

/**
 * POST /api/jobs/cleanup
 * Authorization: Bearer <firebase_id_token>
 *
 * Deletes completed/failed jobs older than JOB_RETENTION_DAYS (default: 7).
 * Response: { deleted: number }
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const JOB_RETENTION_DAYS = Number(process.env.JOB_RETENTION_DAYS ?? "7");

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

    try {
        const olderThanMs = JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const deleted = await deleteOldJobs(uid, idToken, olderThanMs);
        logger.info("jobs/cleanup", "Deleted old jobs", { deleted, uid });
        return NextResponse.json({ deleted });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("jobs/cleanup", "Cleanup failed", { error: msg });
        return NextResponse.json({ error: "cleanup_failed" }, { status: 500 });
    }
}
