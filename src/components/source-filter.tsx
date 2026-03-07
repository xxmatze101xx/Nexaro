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



export { SOURCE_CONFIG };
