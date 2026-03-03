"use client";

import { cn } from "@/lib/utils";

const SOURCE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    gmail: { icon: "✉️", label: "Gmail", color: "text-red-500" },
    slack: { icon: "💬", label: "Slack", color: "text-purple-500" },
    gcal: { icon: "📅", label: "Calendar", color: "text-blue-500" },
    outlook: { icon: "📧", label: "Outlook", color: "text-sky-500" },
    teams: { icon: "👥", label: "Teams", color: "text-indigo-500" },
    proton: { icon: "🔒", label: "Proton", color: "text-violet-500" },
    apple: { icon: "🍎", label: "Apple", color: "text-gray-500" },
};

interface SourceIconProps {
    source: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function SourceIcon({ source, size = "md", className }: SourceIconProps) {
    const config = SOURCE_CONFIG[source] || { icon: "📌", label: source, color: "text-gray-400" };
    const sizeClasses = {
        sm: "w-6 h-6 text-xs",
        md: "w-8 h-8 text-sm",
        lg: "w-10 h-10 text-base",
    };

    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-lg bg-muted",
                sizeClasses[size],
                className
            )}
            title={config.label}
        >
            <span>{config.icon}</span>
        </div>
    );
}

interface SourceFilterProps {
    sources: string[];
    activeSource: string | null;
    onSourceChange: (source: string | null) => void;
    className?: string;
}

export function SourceFilter({ sources, activeSource, onSourceChange, className }: SourceFilterProps) {
    const allSources = ["all", ...sources];

    return (
        <div className={cn("flex items-center gap-2 overflow-x-auto pb-1", className)}>
            {allSources.map((source) => {
                const isActive = source === "all" ? activeSource === null : activeSource === source;
                const config = SOURCE_CONFIG[source];

                return (
                    <button
                        key={source}
                        onClick={() => onSourceChange(source === "all" ? null : source)}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                            "hover:scale-105 active:scale-95",
                            isActive
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        {source === "all" ? (
                            <>
                                <span>📥</span>
                                <span>All</span>
                            </>
                        ) : (
                            <>
                                <span>{config?.icon || "📌"}</span>
                                <span>{config?.label || source}</span>
                            </>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export { SOURCE_CONFIG };
