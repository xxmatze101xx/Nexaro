"use client";

/**
 * DecisionsDashboard
 *
 * Displays AI-extracted business decisions from the user's communications.
 * Shows a card per decision with title, description, source, sender, and date.
 * Provides an "Extract Decisions" button to run AI analysis on recent messages.
 */

import type { Decision } from "@/hooks/useDecisions";

const SOURCE_LABELS: Record<string, string> = {
    gmail: "Gmail",
    slack: "Slack",
    teams: "Teams",
    outlook: "Outlook",
};

const SOURCE_COLORS: Record<string, string> = {
    gmail: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    slack: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    teams: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    outlook: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

function DecisionCard({ decision }: { decision: Decision }) {
    const date = new Date(decision.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
    const sourceLabel = SOURCE_LABELS[decision.source] ?? decision.source;
    const sourceColor =
        SOURCE_COLORS[decision.source] ??
        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-snug">
                    {decision.title}
                </p>
                <span
                    className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${sourceColor}`}
                >
                    {sourceLabel}
                </span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                {decision.description}
            </p>

            <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
                <span>From: {decision.relatedSender}</span>
                <span>·</span>
                <span>{date}</span>
                {decision.status === "open" && (
                    <>
                        <span>·</span>
                        <span className="text-amber-500 dark:text-amber-400 font-medium">Open</span>
                    </>
                )}
            </div>
        </div>
    );
}

interface DecisionsDashboardProps {
    decisions: Decision[];
    isLoading: boolean;
    isExtracting: boolean;
    error: string | null;
    onExtract: () => void;
    onRefresh: () => void;
    className?: string;
}

export function DecisionsDashboard({
    decisions,
    isLoading,
    isExtracting,
    error,
    onExtract,
    onRefresh,
    className = "",
}: DecisionsDashboardProps) {
    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Decision Intelligence
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        AI-detected business decisions from your communications
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        ↺ Refresh
                    </button>
                    <button
                        onClick={onExtract}
                        disabled={isExtracting}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {isExtracting ? (
                            <>
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                Analyzing…
                            </>
                        ) : (
                            "✦ Extract Decisions"
                        )}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div
                            key={i}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 animate-pulse"
                        >
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full mb-1" />
                            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : decisions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-12 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-xl">
                        ⚖️
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            No decisions detected yet
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Click &ldquo;Extract Decisions&rdquo; to analyze your recent communications
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {decisions.map(decision => (
                        <DecisionCard key={decision.id} decision={decision} />
                    ))}
                </div>
            )}
        </div>
    );
}
