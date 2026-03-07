"use client";

import { cn } from "@/lib/utils";

interface ImportanceBadgeProps {
    /** Score on 0–10 scale (from Python pipeline / Firestore). Displayed as 0–100. */
    score: number;
    className?: string;
}

export function ImportanceBadge({ score, className }: ImportanceBadgeProps) {
    // Convert Python 0–10 scale to 0–100 for display
    const displayScore = Math.round(score * 10);

    const getBadgeConfig = (s: number) => {
        if (s >= 80) return { label: "High",   bgClass: "bg-red-500/60" };
        if (s >= 50) return { label: "Medium", bgClass: "bg-amber-500/60" };
        return            { label: "Low",    bgClass: "bg-slate-400/60" };
    };

    const config = getBadgeConfig(displayScore);

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground transition-colors",
                className
            )}
            title={`Importance Score: ${displayScore}/100`}
        >
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.bgClass)} />
            <span className="opacity-80 group-hover:opacity-100 transition-opacity">{displayScore}</span>
        </span>
    );
}
