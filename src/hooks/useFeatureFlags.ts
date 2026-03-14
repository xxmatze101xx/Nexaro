/**
 * useFeatureFlags.ts — Client-side React hook for feature flags.
 *
 * Reads flags from Firestore (users/{uid}/config/flags) via realtime listener.
 * Updates propagate immediately without page reload.
 *
 * Usage:
 *   const { flags, isLoading } = useFeatureFlags(user?.uid);
 *   if (isFeatureEnabled("ai_agent_enabled", flags)) { ... }
 *
 *   // Or convenience hook for a single flag:
 *   const aiEnabled = useFlag("ai_agent_enabled", user?.uid);
 */

"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    FLAG_DEFAULTS,
    FLAG_KEYS,
    resolveFlags,
    isFeatureEnabled,
} from "@/lib/flags";
import type { FeatureFlag, FlagValues } from "@/lib/flags";

export interface UseFeatureFlagsResult {
    flags: FlagValues;
    isLoading: boolean;
    /** Toggle or set a specific flag. Persists to Firestore immediately. */
    setFlag: (flag: FeatureFlag, value: boolean) => Promise<void>;
}

export function useFeatureFlags(uid: string | undefined): UseFeatureFlagsResult {
    const [flags, setFlags] = useState<FlagValues>({ ...FLAG_DEFAULTS });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!uid) {
            setFlags({ ...FLAG_DEFAULTS });
            setIsLoading(false);
            return;
        }

        const ref = doc(db, "users", uid, "config", "flags");
        const unsub = onSnapshot(
            ref,
            snap => {
                if (!snap.exists()) {
                    setFlags({ ...FLAG_DEFAULTS });
                } else {
                    const data = snap.data() as Partial<FlagValues>;
                    setFlags(resolveFlags(data));
                }
                setIsLoading(false);
            },
            () => {
                // On error (e.g. permission denied), fall back to defaults silently
                setFlags({ ...FLAG_DEFAULTS });
                setIsLoading(false);
            },
        );

        return () => unsub();
    }, [uid]);

    const setFlag = async (flag: FeatureFlag, value: boolean): Promise<void> => {
        if (!uid) return;
        // Optimistic update
        setFlags(prev => ({ ...prev, [flag]: value }));
        try {
            const ref = doc(db, "users", uid, "config", "flags");
            await setDoc(ref, { [flag]: value }, { merge: true });
        } catch {
            // Revert on failure
            setFlags(prev => ({ ...prev, [flag]: !value }));
        }
    };

    return { flags, isLoading, setFlag };
}

/**
 * Convenience hook for checking a single flag.
 * Returns the flag value (or default) with no loading state.
 */
export function useFlag(flag: FeatureFlag, uid: string | undefined): boolean {
    const { flags } = useFeatureFlags(uid);
    return isFeatureEnabled(flag, flags);
}

export { FLAG_KEYS, isFeatureEnabled };
export type { FeatureFlag, FlagValues };
