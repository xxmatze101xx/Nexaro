/**
 * useSyncEngine.ts
 * React hook that drives the Nexaro Integration Sync Engine.
 *
 * - Runs an initial sync when credentials become available for the first time.
 * - Polls every POLL_INTERVAL_MS for incremental updates.
 * - Returns syncedMessages (deduplicated map), per-service status, and a manual trigger.
 *
 * Design: messages live in memory in this hook and are merged into allMessages by page.tsx.
 * Sync state (historyId / channelCursors) is persisted to Firestore for cross-session continuity.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { syncEngine } from "@/lib/sync";
import type { SyncResult, SyncStatus } from "@/lib/sync";
import type { UnifiedMessage } from "@/lib/normalizers/types";
import type { User } from "firebase/auth";
import type { SlackChannel } from "@/lib/slack";
import { enqueueEmbeddingJobs } from "@/lib/embeddings";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export interface SyncEngineStatus {
    gmail: SyncStatus;
    slack: SyncStatus;
    teams: SyncStatus;
}

export interface UseSyncEngineResult {
    /** Deduplicated map of all messages fetched by the sync engine (id → message) */
    syncedMessages: Map<string, UnifiedMessage>;
    syncStatus: SyncEngineStatus;
    lastSyncAt: string | null;
    /** Manually trigger an incremental sync right now */
    triggerSync: () => void;
}

interface SyncEngineOptions {
    user: User | null;
    gmailAccounts: { email: string; token: string }[];
    slackConnected: boolean;
    slackChannels: SlackChannel[];
    microsoftConnected: boolean;
    /** When true, new messages are automatically enqueued for embedding generation */
    enableEmbeddings?: boolean;
}

export function useSyncEngine({
    user,
    gmailAccounts,
    slackConnected,
    slackChannels,
    microsoftConnected,
    enableEmbeddings = false,
}: SyncEngineOptions): UseSyncEngineResult {
    const [syncedMessages, setSyncedMessages] = useState<Map<string, UnifiedMessage>>(new Map());
    const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>({ gmail: "idle", slack: "idle", teams: "idle" });
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

    // Track whether initial sync has been triggered to avoid redundant calls
    const initialSyncDoneRef = useRef<Set<string>>(new Set());
    const isSyncingRef = useRef(false);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track message IDs already enqueued for embedding to avoid duplicates
    const embeddingEnqueuedRef = useRef<Set<string>>(new Set());

    const mergeMessages = useCallback((incoming: UnifiedMessage[]) => {
        if (incoming.length === 0) return;
        setSyncedMessages(prev => {
            const next = new Map(prev);
            incoming.forEach(m => next.set(m.id, m));
            return next;
        });
        if (enableEmbeddings && user) {
            const newMessages = incoming.filter(m => !embeddingEnqueuedRef.current.has(m.id));
            if (newMessages.length > 0) {
                newMessages.forEach(m => embeddingEnqueuedRef.current.add(m.id));
                user.getIdToken()
                    .then(idToken => { void enqueueEmbeddingJobs(newMessages, user, idToken); })
                    .catch(() => undefined);
            }
        }
    }, [user, enableEmbeddings]);

    const runSync = useCallback(async () => {
        if (!user || isSyncingRef.current) return;
        isSyncingRef.current = true;

        const results: SyncResult[] = [];

        // ── Gmail ──────────────────────────────────────────────────────────────
        if (gmailAccounts.length > 0) {
            setSyncStatus(prev => ({ ...prev, gmail: "syncing" }));
            try {
                const gmailResults = await Promise.all(
                    gmailAccounts.map(acc =>
                        syncEngine.syncGmail(user.uid, { uid: user.uid, email: acc.email }),
                    ),
                );
                gmailResults.forEach(r => results.push(r));

                const hasError = gmailResults.some(r => r.errors.length > 0 && r.added === 0);
                setSyncStatus(prev => ({ ...prev, gmail: hasError ? "error" : "idle" }));

                const allMessages = gmailResults.flatMap(r => r.messages);
                mergeMessages(allMessages);
            } catch (e: unknown) {
                console.warn("[useSyncEngine] Gmail sync failed:", e instanceof Error ? e.message : String(e));
                setSyncStatus(prev => ({ ...prev, gmail: "error" }));
            }
        }

        // ── Slack ──────────────────────────────────────────────────────────────
        if (slackConnected && slackChannels.length > 0) {
            setSyncStatus(prev => ({ ...prev, slack: "syncing" }));
            try {
                const idToken = await user.getIdToken();
                const channelIds = slackChannels.map(ch => ch.id);
                const channelNames = Object.fromEntries(slackChannels.map(ch => [ch.id, ch.name]));
                const slackResult = await syncEngine.syncSlack(user.uid, {
                    uid: user.uid,
                    idToken,
                    channelIds,
                    channelNames,
                });
                results.push(slackResult);

                const hasError = slackResult.errors.length > 0 && slackResult.added === 0;
                setSyncStatus(prev => ({ ...prev, slack: hasError ? "error" : "idle" }));
                mergeMessages(slackResult.messages);
            } catch (e: unknown) {
                console.warn("[useSyncEngine] Slack sync failed:", e instanceof Error ? e.message : String(e));
                setSyncStatus(prev => ({ ...prev, slack: "error" }));
            }
        }

        // ── Microsoft Teams ────────────────────────────────────────────────────
        if (microsoftConnected) {
            setSyncStatus(prev => ({ ...prev, teams: "syncing" }));
            try {
                const idToken = await user.getIdToken();
                const teamsResult = await syncEngine.syncTeams(user.uid, {
                    uid: user.uid,
                    idToken,
                });
                results.push(teamsResult);

                const hasError = teamsResult.errors.length > 0 && teamsResult.added === 0;
                setSyncStatus(prev => ({ ...prev, teams: hasError ? "error" : "idle" }));
                mergeMessages(teamsResult.messages);
            } catch (e: unknown) {
                console.warn("[useSyncEngine] Teams sync failed:", e instanceof Error ? e.message : String(e));
                setSyncStatus(prev => ({ ...prev, teams: "error" }));
            }
        }

        if (results.length > 0) {
            setLastSyncAt(new Date().toISOString());
        }

        isSyncingRef.current = false;
    }, [user, gmailAccounts, slackConnected, slackChannels, microsoftConnected, mergeMessages]);

    // ── Initial sync when credentials first become available ──────────────────
    useEffect(() => {
        if (!user) return;

        const key = `${user.uid}_${gmailAccounts.map(a => a.email).join(",")}_${slackChannels.map(c => c.id).join(",")}_ms${microsoftConnected ? 1 : 0}`;
        if (initialSyncDoneRef.current.has(key)) return;
        if (gmailAccounts.length === 0 && !slackConnected && !microsoftConnected) return;

        initialSyncDoneRef.current.add(key);
        runSync();
    }, [user, gmailAccounts, slackConnected, slackChannels, microsoftConnected, runSync]);

    // ── Polling: incremental sync every 2 minutes ─────────────────────────────
    useEffect(() => {
        if (!user) return;

        pollTimerRef.current = setInterval(runSync, POLL_INTERVAL_MS);

        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, [user, runSync]);

    // ── Clear messages on logout ───────────────────────────────────────────────
    useEffect(() => {
        if (!user) {
            setSyncedMessages(new Map());
            initialSyncDoneRef.current.clear();
            embeddingEnqueuedRef.current.clear();
        }
    }, [user]);

    const triggerSync = useCallback(() => {
        runSync();
    }, [runSync]);

    return { syncedMessages, syncStatus, lastSyncAt, triggerSync };
}
