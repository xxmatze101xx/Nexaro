"use client";

import { useState } from "react";

/**
 * DailyBriefingPanel
 *
 * Displays the AI-generated daily executive briefing.
 * Shows a "Generate" button when no briefing exists for today,
 * a spinner while generating, and structured output when ready.
 *
 * Placed in the main content header area of the inbox dashboard.
 */

interface DailyBriefingPanelProps {
    briefing: string | null;
    generatedAt: string | null;
    isGenerating: boolean;
    error: string | null;
    onGenerate: () => void;
    className?: string;
}

function BriefingSection({ text }: { text: string }) {
    const sections = text.split(
        /\n(?=PRIORITY TOPICS:|PENDING ACTIONS:|KEY CONTEXT:)/,
    );

    return (
        <div className="space-y-3">
            {sections.map((section, i) => {
                const colonIdx = section.indexOf(":");
                if (colonIdx === -1) {
                    return section.trim() ? (
                        <p key={i} className="text-xs text-foreground leading-relaxed">
                            {section.trim()}
                        </p>
                    ) : null;
                }

                const heading = section.slice(0, colonIdx).trim();
                const body = section.slice(colonIdx + 1).trim();
                const lines = body.split("\n").filter(l => l.trim());

                return (
                    <div key={i}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                            {heading}
                        </p>
                        <ul className="space-y-1">
                            {lines.map((line, j) => (
                                <li
                                    key={j}
                                    className="flex gap-2 text-xs text-foreground leading-relaxed"
                                >
                                    <span className="shrink-0 mt-0.5 w-1 h-1 rounded-full bg-blue-400 dark:bg-blue-500 translate-y-[5px]" />
                                    <span>{line.replace(/^[-•]\s*/, "")}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}

function GeneratedAt({ iso }: { iso: string }) {
    const time = new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
    return (
        <span className="text-[10px] text-muted-foreground">
            Generated at {time}
        </span>
    );
}

export function DailyBriefingPanel({
    briefing,
    generatedAt,
    isGenerating,
    error,
    onGenerate,
    className = "",
}: DailyBriefingPanelProps) {
    const [collapsed, setCollapsed] = useState(true);

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

    return (
        <div
            className={`rounded-xl border border-border bg-muted/40 p-4 ${className}`}
        >
            {/* Header */}
            <div className={`flex items-center justify-between ${collapsed ? "" : "mb-3"}`}>
                <button
                    onClick={() => setCollapsed(c => !c)}
                    className="flex items-center gap-2 text-left group"
                    title={collapsed ? "Expand briefing" : "Collapse briefing"}
                >
                    <svg
                        className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            Executive Briefing
                        </p>
                        {collapsed && (
                            <p className="text-xs text-muted-foreground">{today}</p>
                        )}
                        {!collapsed && (
                            <p className="text-xs text-muted-foreground">{today}</p>
                        )}
                    </div>
                </button>

                <div className="flex items-center gap-2">
                    {generatedAt && <GeneratedAt iso={generatedAt} />}
                    <button
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        title={briefing ? "Refresh briefing" : "Generate today's briefing"}
                    >
                        {isGenerating ? (
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
                        ) : briefing ? (
                            "↺ Refresh"
                        ) : (
                            "✦ Generate"
                        )}
                    </button>
                </div>
            </div>

            {/* Content — hidden when collapsed */}
            {!collapsed && (
                <>
                    {isGenerating && !briefing && (
                        <div className="py-4 flex flex-col items-center gap-2 text-muted-foreground">
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <span
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-600 animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }}
                                    />
                                ))}
                            </div>
                            <p className="text-xs">Analyzing your communications…</p>
                        </div>
                    )}

                    {error && !isGenerating && (
                        <p className="text-xs text-red-600 dark:text-red-400 py-2">
                            {error} —{" "}
                            <button onClick={onGenerate} className="underline hover:no-underline">
                                retry
                            </button>
                        </p>
                    )}

                    {!briefing && !isGenerating && !error && (
                        <p className="text-xs text-muted-foreground py-2">
                            Generate your daily executive briefing to get a prioritized summary of today&apos;s communications.
                        </p>
                    )}

                    {briefing && <BriefingSection text={briefing} />}
                </>
            )}
        </div>
    );
}
