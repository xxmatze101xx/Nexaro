/**
 * useDecisions.ts
 *
 * Manages the Decision Intelligence pipeline:
 *   - Loads stored decisions from Firestore via GET /api/decisions
 *   - Provides extractDecisions(messages) to run AI extraction and store new decisions
 *   - Deduplicates by relatedMessageId so re-runs don't duplicate entries
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import type { Decision } from "@/app/api/decisions/route";
import type { Message } from "@/lib/mock-data";

export type { Decision };

export interface UseDecisionsResult {
    decisions: Decision[];
    isLoading: boolean;
    isExtracting: boolean;
    error: string | null;
    extractDecisions: (messages: Message[]) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useDecisions(uid: string | null): UseDecisionsResult {
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDecisions = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) return;

        setIsLoading(true);
        setError(null);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch("/api/decisions", {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            if (!res.ok) throw new Error(`API error ${res.status}`);
            const data = (await res.json()) as { decisions: Decision[] };
            setDecisions(data.decisions);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load decisions");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load on mount when uid becomes available
    useEffect(() => {
        if (uid) {
            fetchDecisions().catch(() => {});
        } else {
            setDecisions([]);
        }
    }, [uid, fetchDecisions]);

    const extractDecisions = useCallback(
        async (messages: Message[]) => {
            const user = auth.currentUser;
            if (!user || messages.length === 0) return;

            setIsExtracting(true);
            setError(null);
            try {
                const idToken = await user.getIdToken();
                const payload = messages.slice(0, 20).map(m => ({
                    id: m.id,
                    sender: m.sender,
                    subject: m.subject ?? "(no subject)",
                    content: m.content.slice(0, 500),
                    source: m.source,
                    timestamp: m.timestamp,
                }));

                const res = await fetch("/api/decisions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ messages: payload }),
                });

                if (!res.ok) throw new Error(`API error ${res.status}`);

                const data = (await res.json()) as { extracted: number; decisions: Decision[] };

                // Merge new decisions, dedup by relatedMessageId
                if (data.decisions.length > 0) {
                    setDecisions(prev => {
                        const existingIds = new Set(prev.map(d => d.relatedMessageId));
                        const fresh = data.decisions.filter(d => !existingIds.has(d.relatedMessageId));
                        return [...fresh, ...prev];
                    });
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Extraction failed");
            } finally {
                setIsExtracting(false);
            }
        },
        [],
    );

    return {
        decisions,
        isLoading,
        isExtracting,
        error,
        extractDecisions,
        refresh: fetchDecisions,
    };
}
