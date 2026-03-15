/**
 * useSemanticSearch.ts — Debounced semantic search hook for Nexaro.
 *
 * Calls POST /api/search with the query string and returns a ranked list of
 * messageIds. Falls back gracefully (returns null) when:
 *   - query is too short (< 3 chars)
 *   - user is not authenticated
 *   - API returns fallback:true (no embeddings stored yet)
 *
 * When fallback is true, the UI should use its existing keyword filter.
 */

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";

export interface SemanticSearchResult {
    messageId: string;
    score: number;
}

export interface UseSemanticSearchReturn {
    results: SemanticSearchResult[] | null;
    isSearching: boolean;
    /** True when the API returned fallback:true — use keyword filter instead */
    isFallback: boolean;
}

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

export function useSemanticSearch(query: string): UseSemanticSearchReturn {
    const [results, setResults] = useState<SemanticSearchResult[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isFallback, setIsFallback] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (abortRef.current) abortRef.current.abort();

        if (!query || query.length < MIN_QUERY_LENGTH) {
            setResults(null);
            setIsFallback(false);
            setIsSearching(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            const user = auth.currentUser;
            if (!user) {
                setIsFallback(true);
                return;
            }

            setIsSearching(true);
            const controller = new AbortController();
            abortRef.current = controller;

            try {
                const idToken = await user.getIdToken();
                const res = await fetch("/api/search", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ query }),
                    signal: controller.signal,
                });

                if (!res.ok) {
                    setIsFallback(true);
                    return;
                }

                const data = (await res.json()) as {
                    results: SemanticSearchResult[];
                    fallback?: boolean;
                };

                if (data.fallback) {
                    setIsFallback(true);
                    setResults(null);
                } else {
                    setIsFallback(false);
                    setResults(data.results);
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name === "AbortError") return;
                setIsFallback(true);
            } finally {
                setIsSearching(false);
            }
        }, DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, [query]);

    return { results, isSearching, isFallback };
}
