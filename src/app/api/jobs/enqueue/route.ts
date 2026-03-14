import { NextResponse } from "next/server";
import { enqueueJob } from "@/lib/jobs";
import { logger } from "@/lib/logger";
import type { JobType } from "@/lib/jobs";

/**
 * POST /api/jobs/enqueue
 * Authorization: Bearer <firebase_id_token>
 * Body: { type: JobType, input: Record<string, unknown> }
 *
 * Creates a background job in Firestore and returns the jobId immediately.
 * The caller should then POST to /api/jobs/process to execute the job,
 * and poll /api/jobs/status?jobId=<id> to check completion.
 *
 * Response: { jobId: string }
 */

const VALID_JOB_TYPES: JobType[] = [
    "thread_summary",
    "action_extraction",
    "decision_detection",
    "embedding_generation",
];

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

export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: { type?: string; input?: Record<string, unknown> };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!body.type || !VALID_JOB_TYPES.includes(body.type as JobType)) {
        return NextResponse.json(
            { error: "invalid_job_type", valid: VALID_JOB_TYPES },
            { status: 400 },
        );
    }

    if (!body.input || typeof body.input !== "object") {
        return NextResponse.json({ error: "input_required" }, { status: 400 });
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    try {
        const job = await enqueueJob(uid, body.type as JobType, body.input, idToken);
        logger.info("jobs/enqueue", "Job enqueued", { uid, jobId: job.id, type: job.type });
        return NextResponse.json({ jobId: job.id, status: job.status });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("jobs/enqueue", "Failed to enqueue job", { error: msg, type: body.type });
        return NextResponse.json({ error: "enqueue_failed" }, { status: 500 });
    }
}
