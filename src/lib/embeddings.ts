/**
 * embeddings.ts — Embedding Pipeline utilities for Nexaro.
 *
 * Manages the lifecycle of message embeddings:
 * - Enqueuing embedding_generation jobs for new messages
 * - Checking which messages already have embeddings (to avoid duplicate jobs)
 * - Batch-enqueueing for bulk operations
 *
 * Embeddings are stored in: users/{uid}/embeddings/{messageId}
 * They contain the vector + metadata — NOT the original message text.
 *
 * Usage:
 *   import { enqueueEmbeddingJobs } from "@/lib/embeddings";
 *   await enqueueEmbeddingJobs(messages, user, idToken);
 */

import type { User } from "firebase/auth";
import type { UnifiedMessage } from "@/lib/normalizers/types";
import { clientLogger } from "@/lib/client-logger";

/** Maximum number of embedding jobs to enqueue per batch to avoid API flooding. */
const MAX_BATCH_SIZE = 10;

/** Maximum preview text length sent to the embedding API (privacy + token limit). */
const MAX_TEXT_LENGTH = 500;

/**
 * Enqueue embedding_generation jobs for a list of new messages.
 *
 * - Only enqueues up to MAX_BATCH_SIZE messages per call to throttle API usage.
 * - Sends only the preview (capped at MAX_TEXT_LENGTH chars) — never the full body.
 * - Fire-and-forget: failures are logged but don't block the caller.
 */
export async function enqueueEmbeddingJobs(
    messages: UnifiedMessage[],
    user: User,
    idToken: string,
): Promise<void> {
    if (messages.length === 0) return;

    const batch = messages.slice(0, MAX_BATCH_SIZE);

    await Promise.all(
        batch.map(async msg => {
            try {
                const text = msg.preview.slice(0, MAX_TEXT_LENGTH);
                if (!text.trim()) return;

                await fetch("/api/jobs/enqueue", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        type: "embedding_generation",
                        input: {
                            text,
                            messageId: msg.id,
                            source: msg.source,
                            messageTimestamp: msg.timestamp,
                            subject: msg.metadata?.subject ?? "",
                            sender: msg.sender,
                        },
                    }),
                });
            } catch (e: unknown) {
                clientLogger.warn("embeddings", "Failed to enqueue embedding job", {
                    messageId: msg.id,
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }),
    );

    if (batch.length > 0) {
        clientLogger.info("embeddings", `Enqueued ${batch.length} embedding job(s)`, {
            uid: user.uid,
        });
    }
}

/**
 * Check whether a message already has an embedding stored in Firestore.
 * Used to avoid enqueueing duplicate embedding jobs.
 */
export async function hasEmbedding(uid: string, messageId: string): Promise<boolean> {
    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!projectId || !apiKey) return false;

        const docId = messageId.replace(/[^a-zA-Z0-9_-]/g, "_");
        const res = await fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/embeddings/${docId}?key=${apiKey}`,
        );
        return res.ok && res.status !== 404;
    } catch {
        return false;
    }
}
