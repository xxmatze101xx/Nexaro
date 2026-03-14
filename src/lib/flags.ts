/**
 * flags.ts — Feature Flag System for Nexaro.
 *
 * Flags are stored in Firestore at users/{uid}/config/flags.
 * This enables toggling features without redeploying the app.
 *
 * Server-side: use getFlags(uid, idToken) + isFeatureEnabled(flag, flags)
 * Client-side: use the useFeatureFlags() / useFlag() hooks
 *
 * Adding a new flag:
 *   1. Add it to the FeatureFlag union type
 *   2. Add a default in FLAG_DEFAULTS
 *   3. Add a label + description in FLAG_META
 *   4. Wrap the feature with isFeatureEnabled(flag, flags)
 */

// ── Flag registry ─────────────────────────────────────────────────────────────

export type FeatureFlag =
    | "ai_agent_enabled"               // Background AI job system (summaries, extraction)
    | "decision_dashboard_enabled"     // Decision detection job type + future dashboard
    | "predictive_intelligence_enabled" // Embedding generation + semantic search
    | "slack_sync_enabled"             // Slack sync engine (polling + incremental)
    | "microsoft_sync_enabled";        // Microsoft / Teams sync engine

/** Flat map of flag → current boolean value. */
export type FlagValues = Record<FeatureFlag, boolean>;

/**
 * Default values applied when no Firestore document exists.
 * Conservative defaults: only stable features are on by default.
 */
export const FLAG_DEFAULTS: FlagValues = {
    ai_agent_enabled: true,
    decision_dashboard_enabled: true,
    predictive_intelligence_enabled: false, // Requires OPENAI_API_KEY
    slack_sync_enabled: true,
    microsoft_sync_enabled: false,          // Blocked on MICROSOFT_CLIENT_ID/SECRET
};

/** Human-readable metadata shown in the Settings UI. */
export interface FlagMeta {
    label: string;
    description: string;
    experimental: boolean;
}

export const FLAG_META: Record<FeatureFlag, FlagMeta> = {
    ai_agent_enabled: {
        label: "AI Agent (Background Jobs)",
        description: "Enable background AI tasks: thread summaries, action extraction, decision detection.",
        experimental: false,
    },
    decision_dashboard_enabled: {
        label: "Decision Detection",
        description: "Detect decisions and commitments in messages using AI.",
        experimental: false,
    },
    predictive_intelligence_enabled: {
        label: "Predictive Intelligence",
        description: "Generate semantic embeddings for messages to enable AI-powered search. Requires OPENAI_API_KEY.",
        experimental: true,
    },
    slack_sync_enabled: {
        label: "Slack Sync",
        description: "Continuously sync Slack channels in the background.",
        experimental: false,
    },
    microsoft_sync_enabled: {
        label: "Microsoft / Teams Sync",
        description: "Sync Microsoft Teams and Outlook messages. Requires Microsoft OAuth credentials.",
        experimental: true,
    },
};

// ── Pure helper ───────────────────────────────────────────────────────────────

/**
 * Check whether a feature flag is enabled.
 * Falls back to FLAG_DEFAULTS if the flag is not present in the provided values.
 */
export function isFeatureEnabled(flag: FeatureFlag, flags: Partial<FlagValues>): boolean {
    return flags[flag] ?? FLAG_DEFAULTS[flag];
}

/**
 * Merge partial flag values with defaults.
 * Guarantees a complete FlagValues record.
 */
export function resolveFlags(partial: Partial<FlagValues>): FlagValues {
    return { ...FLAG_DEFAULTS, ...partial };
}

// ── Ordered list for UI rendering ────────────────────────────────────────────

export const FLAG_KEYS = Object.keys(FLAG_DEFAULTS) as FeatureFlag[];

// ── Firestore helpers (server-side, via REST API) ─────────────────────────────

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
}/databases/(default)/documents`;

interface FsDoc {
    fields?: Record<string, { booleanValue?: boolean }>;
}

/**
 * Read all flags for a user from Firestore.
 * Returns defaults if the document doesn't exist yet.
 */
export async function getFlags(uid: string, idToken: string): Promise<FlagValues> {
    try {
        const res = await fetch(`${FIRESTORE_BASE}/users/${uid}/config/flags`, {
            headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.status === 404) return { ...FLAG_DEFAULTS };
        if (!res.ok) return { ...FLAG_DEFAULTS };

        const doc = (await res.json()) as FsDoc;
        const partial: Partial<FlagValues> = {};
        for (const key of FLAG_KEYS) {
            const field = doc.fields?.[key];
            if (field?.booleanValue !== undefined) {
                partial[key] = field.booleanValue;
            }
        }
        return resolveFlags(partial);
    } catch {
        return { ...FLAG_DEFAULTS };
    }
}

/**
 * Write flag values for a user to Firestore.
 * Merges with existing flags (PATCH semantics via updateMask).
 */
export async function setFlags(
    uid: string,
    updates: Partial<FlagValues>,
    idToken: string,
): Promise<void> {
    const fields: Record<string, { booleanValue: boolean }> = {};
    const updateKeys: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
        if (typeof value === "boolean") {
            fields[key] = { booleanValue: value };
            updateKeys.push(key);
        }
    }

    if (updateKeys.length === 0) return;

    const maskParam = updateKeys.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");

    await fetch(`${FIRESTORE_BASE}/users/${uid}/config/flags?${maskParam}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ fields }),
    });
}
