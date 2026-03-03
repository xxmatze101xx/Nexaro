"use client";

import { cn } from "@/lib/utils";

interface ImportanceBadgeProps {
    score: number;
    className?: string;
}

export function ImportanceBadge({ score, className }: ImportanceBadgeProps) {
    const getBadgeConfig = (score: number) => {
        if (score >= 7.0) {
            return {
                label: "High",
                emoji: "🔴",
                bgClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
            };
        } else if (score >= 4.0) {
            return {
                label: "Medium",
                emoji: "🟡",
                bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
            };
        } else {
            return {
                label: "Low",
                emoji: "🟢",
                bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            };
        }
    };

    const config = getBadgeConfig(score);

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                config.bgClass,
                className
            )}
        >
            <span>{config.emoji}</span>
            <span>{score.toFixed(1)}</span>
        </span>
    );
}
