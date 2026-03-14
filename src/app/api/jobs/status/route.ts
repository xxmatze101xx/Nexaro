import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import { logger } from "@/lib/logger";

/**
 * GET /api/jobs/status?jobId=<id>
 * Authorization: Bearer <firebase_id_token>
 *
 * Returns the current status and output of a background job.
 * Poll this endpoint after enqueuing a job to check for completion.
 *
 * Response: { job: Job } or { error: string }
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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) {
        return NextResponse.json({ error: "jobId_required" }, { status: 400 });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    try {
        const job = await getJob(uid, jobId, idToken);
        if (!job) {
            return NextResponse.json({ error: "job_not_found" }, { status: 404 });
        }
        return NextResponse.json({ job });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("jobs/status", "Failed to read job", { error: msg, jobId });
        return NextResponse.json({ error: "read_failed" }, { status: 500 });
    }
}
