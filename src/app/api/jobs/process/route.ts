import { NextResponse } from "next/server";
import { getJob, patchJob, listPendingJobs } from "@/lib/jobs";
import { logger } from "@/lib/logger";
import { sanitizeJobPayload, auditForStorage } from "@/lib/privacy";
import { getFlags, isFeatureEnabled } from "@/lib/flags";
import type { Job, JobType } from "@/lib/jobs";
import {
    THREAD_SUMMARY_SYSTEM,
    buildThreadSummaryUserPrompt,
    ACTION_EXTRACTION_SYSTEM,
    buildActionExtractionUserPrompt,
    DECISION_DETECTION_SYSTEM,
    buildDecisionDetectionUserPrompt,
} from "@/lib/ai/prompts";

/**
 * POST /api/jobs/process
 * Authorization: Bearer <firebase_id_token>
 * Body: { jobId?: string }
 *
 * Worker endpoint that processes one background job per request.
 * - If jobId is provided: process that specific job (must be pending or retryable failed).
 * - If no jobId: pick the oldest pending job for this user.
 *
 * Supports retry: if a job fails and retryCount < maxRetries, it remains
 * in "failed" state and can be retried by calling this endpoint again.
 *
 * All AI calls use the GROQ_API_KEY environment variable (llama-3.3-70b-versatile).
 * Embedding generation requires OPENAI_API_KEY (gracefully degrades if absent).
 */

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ── Auth ──────────────────────────────────────────────────────────────────────

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

// ── Groq helper ───────────────────────────────────────────────────────────────

async function callGroq(systemPrompt: string, userPrompt: string, maxTokens = 600): Promise<string> {
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature: 0.3,
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Groq API error: ${res.status} ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) throw new Error("Groq returned empty response");
    return content;
}

// ── Job processors ────────────────────────────────────────────────────────────

async function processThreadSummary(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const messages = input.messages as Array<{ from: string; body: string }> | undefined;
    const subject = String(input.subject ?? "(no subject)");

    if (!messages?.length) throw new Error("input.messages array is required");

    const summary = await callGroq(
        THREAD_SUMMARY_SYSTEM,
        buildThreadSummaryUserPrompt(subject, messages),
        400,
    );

    return { summary };
}

async function processActionExtraction(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const body = String(input.body ?? "");
    const subject = String(input.subject ?? "(no subject)");
    const sender = String(input.sender ?? "Unknown");

    if (!body.trim()) throw new Error("input.body is required");

    const raw = await callGroq(
        ACTION_EXTRACTION_SYSTEM,
        buildActionExtractionUserPrompt(sender, subject, body),
        300,
    );

    let actions: string[] = [];
    try {
        // Strip markdown fences if present
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed: unknown = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
            actions = parsed.filter(a => typeof a === "string");
        }
    } catch {
        // If parsing fails, split on newlines as fallback
        actions = raw
            .split(/\n|•|-/)
            .map(s => s.trim())
            .filter(s => s.length > 5);
    }

    return { actions, count: actions.length };
}

async function processDecisionDetection(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const body = String(input.body ?? "");
    const subject = String(input.subject ?? "(no subject)");

    if (!body.trim()) throw new Error("input.body is required");

    const raw = await callGroq(
        DECISION_DETECTION_SYSTEM,
        buildDecisionDetectionUserPrompt(subject, body),
        300,
    );

    let hasDecision = false;
    let decisions: string[] = [];
    try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleaned) as { hasDecision?: boolean; decisions?: string[] };
        hasDecision = parsed.hasDecision ?? false;
        decisions = (parsed.decisions ?? []).filter(d => typeof d === "string");
    } catch {
        // Best-effort: treat any non-empty response as a decision
        decisions = raw.split("\n").map(s => s.trim()).filter(s => s.length > 5);
        hasDecision = decisions.length > 0;
    }

    return { hasDecision, decisions, count: decisions.length };
}

async function processEmbeddingGeneration(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const text = String(input.text ?? "");
    const messageId = String(input.messageId ?? "");

    if (!text.trim()) throw new Error("input.text is required");

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        // Graceful degradation: embedding infrastructure ready, key not configured
        logger.warn("jobs/process", "OPENAI_API_KEY not configured — embedding skipped", { messageId });
        return {
            messageId,
            embedding: null,
            model: null,
            note: "OPENAI_API_KEY not configured. Set it in .env.local to enable semantic search.",
        };
    }

    const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
            model: "text-embedding-3-small",
            input: text.slice(0, 8000), // token limit safety
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenAI Embeddings error: ${res.status} ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
        data?: Array<{ embedding: number[] }>;
        model?: string;
    };

    const embedding = data.data?.[0]?.embedding ?? null;
    return { messageId, embedding, model: data.model ?? "text-embedding-3-small", dimensions: embedding?.length ?? 0 };
}

// ── Embedding persistence ─────────────────────────────────────────────────────

async function saveEmbedding(
    uid: string,
    idToken: string,
    jobInput: Record<string, unknown>,
    output: Record<string, unknown>,
): Promise<void> {
    const messageId = String(output.messageId ?? jobInput.messageId ?? "");
    const embedding = output.embedding as number[] | null;
    if (!messageId || !embedding || embedding.length === 0) return;

    const docId = messageId.replace(/[^a-zA-Z0-9_-]/g, "_");
    await fetch(`${FIRESTORE_BASE}/users/${uid}/embeddings/${docId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
            fields: {
                messageId: { stringValue: messageId },
                source: { stringValue: String(jobInput.source ?? "") },
                messageTimestamp: { stringValue: String(jobInput.messageTimestamp ?? "") },
                subject: { stringValue: String(jobInput.subject ?? "") },
                sender: { stringValue: String(jobInput.sender ?? "") },
                // Safe 200-char snippet retained for RAG context retrieval (no full body stored)
                contextSnippet: { stringValue: String(jobInput.text ?? "").slice(0, 200) },
                model: { stringValue: String(output.model ?? "text-embedding-3-small") },
                dimensions: { integerValue: String(embedding.length) },
                embeddingJson: { stringValue: JSON.stringify(embedding) },
                createdAt: { stringValue: new Date().toISOString() },
            },
        }),
    }).catch(e => {
        logger.warn("jobs/process", "Failed to persist embedding", {
            messageId,
            error: e instanceof Error ? e.message : String(e),
        });
    });
}

// ── Router ────────────────────────────────────────────────────────────────────

async function runJobProcessor(job: Job): Promise<Record<string, unknown>> {
    const processors: Record<JobType, (input: Record<string, unknown>) => Promise<Record<string, unknown>>> = {
        thread_summary: processThreadSummary,
        action_extraction: processActionExtraction,
        decision_detection: processDecisionDetection,
        embedding_generation: processEmbeddingGeneration,
    };
    return processors[job.type](job.input);
}

// ── Decision persistence ───────────────────────────────────────────────────────

/**
 * Saves a detected decision record to users/{uid}/decisions in Firestore.
 * Called after a successful decision_detection job with hasDecision: true.
 */
async function saveDetectedDecisions(
    uid: string,
    idToken: string,
    jobInput: Record<string, unknown>,
    decisions: string[],
): Promise<void> {
    try {
        const detectedAt = new Date().toISOString();
        await fetch(`${FIRESTORE_BASE}/users/${uid}/decisions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
                fields: {
                    messageId: { stringValue: String(jobInput.messageId ?? "") },
                    messageSubject: { stringValue: String(jobInput.subject ?? "(Kein Betreff)") },
                    messageSender: { stringValue: String(jobInput.sender ?? "Unknown") },
                    decisions: {
                        arrayValue: {
                            values: decisions.map(d => ({ stringValue: d })),
                        },
                    },
                    detectedAt: { stringValue: detectedAt },
                },
            }),
        });
    } catch {
        // Non-critical — log failure but don't fail the job
        logger.warn("jobs/process", "Failed to save decision record", { uid });
    }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const idToken = request.headers.get("Authorization")?.slice(7);
    if (!idToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: { jobId?: string };
    try {
        body = (await request.json()) as typeof body;
    } catch {
        body = {};
    }

    const uid = await verifyIdToken(idToken);
    if (!uid) {
        return NextResponse.json({ error: "token_verify_failed" }, { status: 401 });
    }

    // Resolve which job to process
    let job: Job | null = null;

    if (body.jobId) {
        job = await getJob(uid, body.jobId, idToken);
        if (!job) {
            return NextResponse.json({ error: "job_not_found" }, { status: 404 });
        }
        // Only process pending or retryable-failed jobs
        const isRetryable = job.status === "failed" && job.retryCount < job.maxRetries;
        if (job.status !== "pending" && !isRetryable) {
            return NextResponse.json({ error: "job_not_processable", status: job.status }, { status: 409 });
        }
    } else {
        // Pick oldest pending job
        const pending = await listPendingJobs(uid, idToken, 1);
        job = pending[0] ?? null;
        if (!job) {
            return NextResponse.json({ message: "no_pending_jobs", processed: 0 });
        }
    }

    const startedAt = new Date().toISOString();

    // Feature flag checks — abort early if the feature is disabled
    const flags = await getFlags(uid, idToken);

    if (job.type === "embedding_generation" && !isFeatureEnabled("predictive_intelligence_enabled", flags)) {
        await patchJob(uid, job.id, { status: "failed", error: "feature_disabled:predictive_intelligence_enabled" }, idToken);
        logger.warn("jobs/process", "Job blocked by feature flag", { jobId: job.id, type: job.type, flag: "predictive_intelligence_enabled" });
        return NextResponse.json({ error: "feature_disabled", flag: "predictive_intelligence_enabled" }, { status: 403 });
    }

    if (job.type === "decision_detection" && !isFeatureEnabled("decision_dashboard_enabled", flags)) {
        await patchJob(uid, job.id, { status: "failed", error: "feature_disabled:decision_dashboard_enabled" }, idToken);
        logger.warn("jobs/process", "Job blocked by feature flag", { jobId: job.id, type: job.type, flag: "decision_dashboard_enabled" });
        return NextResponse.json({ error: "feature_disabled", flag: "decision_dashboard_enabled" }, { status: 403 });
    }

    if ((job.type === "thread_summary" || job.type === "action_extraction") && !isFeatureEnabled("ai_agent_enabled", flags)) {
        await patchJob(uid, job.id, { status: "failed", error: "feature_disabled:ai_agent_enabled" }, idToken);
        logger.warn("jobs/process", "Job blocked by feature flag", { jobId: job.id, type: job.type, flag: "ai_agent_enabled" });
        return NextResponse.json({ error: "feature_disabled", flag: "ai_agent_enabled" }, { status: 403 });
    }

    // Mark as running
    await patchJob(uid, job.id, { status: "running", startedAt }, idToken);
    logger.info("jobs/process", "Job started", { uid, jobId: job.id, type: job.type, attempt: job.retryCount + 1 });

    try {
        const rawOutput = await runJobProcessor(job);
        const completedAt = new Date().toISOString();

        // Privacy: sanitize output before persisting — output must never contain full bodies.
        const safeOutput = sanitizeJobPayload(rawOutput, `jobs/${job.id}/output`);

        // Persist detected decisions to the decisions collection before clearing input
        if (
            job.type === "decision_detection" &&
            rawOutput.hasDecision === true &&
            Array.isArray(rawOutput.decisions) &&
            (rawOutput.decisions as string[]).length > 0
        ) {
            void saveDetectedDecisions(uid, idToken, job.input, rawOutput.decisions as string[]);
        }

        // Privacy: clear the job input from Firestore after successful processing.
        // Inputs contain full message bodies which must not be permanently stored.
        await patchJob(
            uid,
            job.id,
            { status: "completed", output: safeOutput, input: {}, completedAt, error: null },
            idToken,
        );

        logger.info("jobs/process", "Job completed — input cleared for privacy", {
            uid,
            jobId: job.id,
            type: job.type,
            durationMs: Date.now() - new Date(startedAt).getTime(),
        });

        // Persist embedding vector to Firestore (fire-and-forget, original text already cleared)
        if (job.type === "embedding_generation" && rawOutput.embedding !== null) {
            void saveEmbedding(uid, idToken, job.input, rawOutput);
        }

        return NextResponse.json({ jobId: job.id, status: "completed", output: safeOutput });

    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const newRetryCount = job.retryCount + 1;
        const isExhausted = newRetryCount >= job.maxRetries;

        await patchJob(
            uid,
            job.id,
            {
                status: "failed",
                error: errorMsg,
                retryCount: newRetryCount,
                // Keep completedAt null on failure so it remains retryable
            },
            idToken,
        );

        logger.error("jobs/process", "Job failed", {
            uid,
            jobId: job.id,
            type: job.type,
            error: errorMsg,
            retryCount: newRetryCount,
            maxRetries: job.maxRetries,
            exhausted: isExhausted,
        });

        return NextResponse.json(
            {
                jobId: job.id,
                status: "failed",
                error: errorMsg,
                retryCount: newRetryCount,
                retriesRemaining: Math.max(0, job.maxRetries - newRetryCount),
            },
            { status: 500 },
        );
    }
}
