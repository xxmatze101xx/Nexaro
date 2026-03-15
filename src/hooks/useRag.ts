/**
 * useRag.ts — Retrieval-Augmented Generation hook for Nexaro.
 *
 * Sends a question to POST /api/ai/rag, which retrieves relevant messages
 * from stored embeddings and generates a grounded AI answer.
 *
 * Falls back gracefully (returns null) when:
 *   - OpenAI embeddings are not configured (OPENAI_API_KEY absent)
 *   - No embeddings have been stored yet for this user
 *   - No context found above the similarity threshold
 */

"use client";

import { useState, useCallback } from "react";
import { auth } from "@/lib/firebase";

export interface RagSource {
    messageId: string;
    subject: string;
    sender: string;
    source: string;
    timestamp: string;
    score: number;
}

export interface RagResult {
    answer: string;
    sources: RagSource[];
}

export interface UseRagReturn {
    ask: (question: string) => Promise<void>;
    result: RagResult | null;
    isLoading: boolean;
    isFallback: boolean;
    error: string | null;
    reset: () => void;
}

export function useRag(): UseRagReturn {
    const [result, setResult] = useState<RagResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFallback, setIsFallback] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setResult(null);
        setIsFallback(false);
        setError(null);
    }, []);

    const ask = useCallback(async (question: string) => {
        const q = question.trim();
        if (!q) return;

        const user = auth.currentUser;
        if (!user) {
            setError("Not authenticated");
            return;
        }

        setIsLoading(true);
        setResult(null);
        setIsFallback(false);
        setError(null);

        try {
            const idToken = await user.getIdToken();
            const res = await fetch("/api/ai/rag", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ question: q }),
            });

            if (!res.ok) {
                setError("Failed to get answer. Please try again.");
                return;
            }

            const data = (await res.json()) as
                | { answer: string; sources: RagSource[] }
                | { fallback: true; reason: string };

            if ("fallback" in data) {
                setIsFallback(true);
            } else {
                setResult(data);
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Unexpected error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { ask, result, isLoading, isFallback, error, reset };
}
