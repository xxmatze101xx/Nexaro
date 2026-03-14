/**
 * jobs.ts — Background Job Queue for Nexaro.
 *
 * Jobs are stored in Firestore at users/{uid}/jobs/{jobId}.
 * The worker (POST /api/jobs/process) processes one job at a time per request,
 * enabling async AI tasks without blocking the UI.
 *
 * Supported job types:
 *   thread_summary      — Summarize a thread of messages
 *   action_extraction   — Extract action items from a message
 *   decision_detection  — Detect decisions/commitments in a message
 *   embedding_generation — Generate a text embedding for semantic search
 */

export type JobType =
    | "thread_summary"
    | "action_extraction"
    | "decision_detection"
    | "embedding_generation";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface Job {
    id: string;
    type: JobType;
    status: JobStatus;
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    error: string | null;
    retryCount: number;
    maxRetries: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
}

export const JOB_MAX_RETRIES: Record<JobType, number> = {
    thread_summary: 3,
    action_extraction: 3,
    decision_detection: 3,
    embedding_generation: 2,
};

// ── Firestore REST helpers ────────────────────────────────────────────────────

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
}/databases/(default)/documents`;

type FsField =
    | { stringValue: string }
    | { integerValue: string }
    | { booleanValue: boolean }
    | { nullValue: null };

interface FsDocument {
    name?: string;
    fields?: Record<string, FsField>;
    createTime?: string;
    updateTime?: string;
}

function toFsField(value: unknown): FsField {
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === "boolean") return { booleanValue: value };
    if (typeof value === "number") return { integerValue: String(value) };
    return { stringValue: String(value) };
}

function fromFsField(field: FsField | undefined): unknown {
    if (!field) return null;
    if ("nullValue" in field) return null;
    if ("booleanValue" in field) return field.booleanValue;
    if ("integerValue" in field) return Number(field.integerValue);
    if ("stringValue" in field) return field.stringValue;
    return null;
}

function docToJob(doc: FsDocument): Job {
    const f = doc.fields ?? {};
    const idFromName = doc.name?.split("/").pop() ?? "";
    return {
        id: String(fromFsField(f.id) ?? idFromName),
        type: String(fromFsField(f.type) ?? "thread_summary") as JobType,
        status: String(fromFsField(f.status) ?? "pending") as JobStatus,
        input: JSON.parse(String(fromFsField(f.input) ?? "{}")),
        output: fromFsField(f.output) ? JSON.parse(String(fromFsField(f.output))) : null,
        error: fromFsField(f.error) as string | null,
        retryCount: Number(fromFsField(f.retryCount) ?? 0),
        maxRetries: Number(fromFsField(f.maxRetries) ?? 3),
        createdAt: String(fromFsField(f.createdAt) ?? new Date().toISOString()),
        startedAt: (fromFsField(f.startedAt) as string | null) ?? null,
        completedAt: (fromFsField(f.completedAt) as string | null) ?? null,
    };
}

function jobToFsFields(job: Partial<Job> & { id?: string }): Record<string, FsField> {
    const fields: Record<string, FsField> = {};
    if (job.id !== undefined) fields.id = toFsField(job.id);
    if (job.type !== undefined) fields.type = toFsField(job.type);
    if (job.status !== undefined) fields.status = toFsField(job.status);
    if (job.input !== undefined) fields.input = toFsField(JSON.stringify(job.input));
    if (job.output !== undefined) fields.output = toFsField(job.output ? JSON.stringify(job.output) : null);
    if (job.error !== undefined) fields.error = toFsField(job.error);
    if (job.retryCount !== undefined) fields.retryCount = toFsField(job.retryCount);
    if (job.maxRetries !== undefined) fields.maxRetries = toFsField(job.maxRetries);
    if (job.createdAt !== undefined) fields.createdAt = toFsField(job.createdAt);
    if (job.startedAt !== undefined) fields.startedAt = toFsField(job.startedAt);
    if (job.completedAt !== undefined) fields.completedAt = toFsField(job.completedAt);
    return fields;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Create a new job in Firestore. Returns the created job with its auto-generated id.
 */
export async function enqueueJob(
    uid: string,
    type: JobType,
    input: Record<string, unknown>,
    idToken: string,
): Promise<Job> {
    const now = new Date().toISOString();
    const jobData: Omit<Job, "id"> = {
        type,
        status: "pending",
        input,
        output: null,
        error: null,
        retryCount: 0,
        maxRetries: JOB_MAX_RETRIES[type],
        createdAt: now,
        startedAt: null,
        completedAt: null,
    };

    const res = await fetch(`${FIRESTORE_BASE}/users/${uid}/jobs`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ fields: jobToFsFields(jobData) }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Firestore job create failed: ${res.status} ${body.slice(0, 200)}`);
    }

    const doc = (await res.json()) as FsDocument;
    const id = doc.name?.split("/").pop() ?? crypto.randomUUID();

    // Patch the id field back into the document
    await patchJob(uid, id, { id }, idToken);

    return { id, ...jobData };
}

/**
 * Read a single job by id.
 */
export async function getJob(uid: string, jobId: string, idToken: string): Promise<Job | null> {
    const res = await fetch(`${FIRESTORE_BASE}/users/${uid}/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore job read failed: ${res.status}`);
    const doc = (await res.json()) as FsDocument;
    return docToJob(doc);
}

/**
 * Update specific fields on a job (PATCH semantics).
 */
export async function patchJob(
    uid: string,
    jobId: string,
    patch: Partial<Job>,
    idToken: string,
): Promise<void> {
    const fields = jobToFsFields(patch);
    const updateMask = Object.keys(fields).map(k => `fields.${k}`).join(",");

    const res = await fetch(
        `${FIRESTORE_BASE}/users/${uid}/jobs/${jobId}?updateMask.fieldPaths=${Object.keys(fields).join("&updateMask.fieldPaths=")}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ fields }),
        },
    );

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Firestore job patch failed: ${res.status} ${body.slice(0, 200)}`);
    }
}

/**
 * List the oldest N pending jobs for a user.
 */
export async function listPendingJobs(
    uid: string,
    idToken: string,
    limit = 10,
): Promise<Job[]> {
    const res = await fetch(
        `${FIRESTORE_BASE}/users/${uid}/jobs?pageSize=${limit}`,
        { headers: { Authorization: `Bearer ${idToken}` } },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as { documents?: FsDocument[] };
    return (data.documents ?? [])
        .map(docToJob)
        .filter(j => j.status === "pending" || (j.status === "failed" && j.retryCount < j.maxRetries))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, limit);
}
