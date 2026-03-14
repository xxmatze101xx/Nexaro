/**
 * useJob.ts — React hook for polling a background job's status.
 *
 * Usage:
 *   const { job, isLoading, error } = useJob(jobId, idToken);
 *
 * Polls /api/jobs/status every 2 seconds while the job is pending or running.
 * Stops polling automatically when the job completes or permanently fails.
 */

import { useState, useEffect, useRef } from "react";
import type { Job } from "@/lib/jobs";

export interface UseJobResult {
    job: Job | null;
    isLoading: boolean;
    error: string | null;
}

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set(["completed", "failed"]);

export function useJob(jobId: string | null, idToken: string | null): UseJobResult {
    const [job, setJob] = useState<Job | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function stopPolling() {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }

    async function fetchStatus() {
        if (!jobId || !idToken) return;

        try {
            const res = await fetch(`/api/jobs/status?jobId=${encodeURIComponent(jobId)}`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });

            if (!res.ok) {
                const data = (await res.json()) as { error?: string };
                setError(data.error ?? "status_check_failed");
                stopPolling();
                return;
            }

            const data = (await res.json()) as { job: Job };
            setJob(data.job);
            setIsLoading(false);

            if (TERMINAL_STATUSES.has(data.job.status)) {
                stopPolling();
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
            stopPolling();
        }
    }

    useEffect(() => {
        if (!jobId || !idToken) {
            setJob(null);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Fetch immediately, then poll
        void fetchStatus();
        intervalRef.current = setInterval(() => void fetchStatus(), POLL_INTERVAL_MS);

        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId, idToken]);

    return { job, isLoading, error };
}

// ── Helper: enqueue + auto-process ───────────────────────────────────────────

export interface EnqueueResult {
    jobId: string;
    status: string;
}

/**
 * Enqueues a job and immediately triggers processing.
 * Returns the jobId so the caller can pass it to useJob() for polling.
 */
export async function enqueueAndProcess(
    type: string,
    input: Record<string, unknown>,
    idToken: string,
): Promise<EnqueueResult> {
    const enqueueRes = await fetch("/api/jobs/enqueue", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ type, input }),
    });

    if (!enqueueRes.ok) {
        const data = (await enqueueRes.json()) as { error?: string };
        throw new Error(data.error ?? "enqueue_failed");
    }

    const { jobId } = (await enqueueRes.json()) as { jobId: string };

    // Trigger processing fire-and-forget — caller polls via useJob()
    void fetch("/api/jobs/process", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ jobId }),
    });

    return { jobId, status: "pending" };
}
