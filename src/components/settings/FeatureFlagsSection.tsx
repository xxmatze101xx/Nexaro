"use client";

import { Beaker, Zap, Loader2 } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { FLAG_KEYS, FLAG_META } from "@/lib/flags";
import type { FeatureFlag } from "@/lib/flags";

interface FeatureFlagsSectionProps {
    uid: string | undefined;
}

export function FeatureFlagsSection({ uid }: FeatureFlagsSectionProps) {
    const { flags, isLoading, setFlag } = useFeatureFlags(uid);

    return (
        <section id="feature-flags">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Feature Flags</p>
                <Beaker className="w-3.5 h-3.5 text-muted-foreground" />
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {FLAG_KEYS.map((flag: FeatureFlag) => {
                            const meta = FLAG_META[flag];
                            const enabled = flags[flag];
                            return (
                                <li key={flag} className="flex items-center justify-between gap-4 px-5 py-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">
                                                {meta.label}
                                            </span>
                                            {meta.experimental && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                    <Zap className="w-2.5 h-2.5" />
                                                    Experimental
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                            {meta.description}
                                        </p>
                                        <code className="text-[10px] text-muted-foreground/60 font-mono mt-1 block">
                                            {flag}
                                        </code>
                                    </div>

                                    {/* Toggle */}
                                    <button
                                        role="switch"
                                        aria-checked={enabled}
                                        aria-label={`Toggle ${meta.label}`}
                                        onClick={() => void setFlag(flag, !enabled)}
                                        className={[
                                            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                                            "transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                            enabled
                                                ? "bg-primary"
                                                : "bg-muted",
                                        ].join(" ")}
                                    >
                                        <span
                                            className={[
                                                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm",
                                                "transform transition duration-200 ease-in-out",
                                                enabled ? "translate-x-5" : "translate-x-0",
                                            ].join(" ")}
                                        />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
                Änderungen werden sofort wirksam — kein Redeploy nötig.
            </p>
        </section>
    );
}
