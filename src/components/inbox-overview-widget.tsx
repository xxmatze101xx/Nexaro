"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/mock-data";
import Image from "next/image";

interface SourceCount {
    source: string;
    unread: number;
    label: string;
    iconPath: string;
}

interface InboxOverviewWidgetProps {
    messages: Message[];
    onFilter: (source: string) => void;
    className?: string;
}

const SOURCE_META: Record<string, { label: string; iconPath: string }> = {
    gmail: { label: "Gmail", iconPath: "/ServiceLogos/Gmail.svg" },
    slack: { label: "Slack", iconPath: "/ServiceLogos/Slack.svg" },
    teams: { label: "Teams", iconPath: "/ServiceLogos/Microsoft Teams.svg" },
    outlook: { label: "Outlook", iconPath: "/ServiceLogos/Outlook.svg" },
};

export function InboxOverviewWidget({ messages, onFilter, className }: InboxOverviewWidgetProps) {
    const counts: SourceCount[] = Object.entries(SOURCE_META)
        .map(([source, meta]) => ({
            source,
            unread: messages.filter(m => m.source === source && m.status === "unread").length,
            ...meta,
        }))
        .filter(c => {
            // Always show sources that have any messages
            return messages.some(m => m.source === c.source);
        });

    const totalUnread = counts.reduce((sum, c) => sum + c.unread, 0);
    if (totalUnread === 0 && counts.length === 0) return null;

    function badgeColor(unread: number) {
        if (unread === 0) return "bg-green-500/20 text-green-700 dark:text-green-400";
        if (unread <= 5) return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
        return "bg-red-500/20 text-red-700 dark:text-red-400";
    }

    return (
        <div className={cn("flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/10 shrink-0 overflow-x-auto", className)}>
            {counts.map(c => (
                <button
                    key={c.source}
                    onClick={() => onFilter(c.source)}
                    title={`${c.label}: ${c.unread} ungelesen`}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/50",
                        "bg-background hover:bg-muted transition-colors shrink-0",
                        "text-xs font-medium"
                    )}
                >
                    <Image src={c.iconPath} alt={c.label} width={14} height={14} className="shrink-0" />
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold", badgeColor(c.unread))}>
                        {c.unread}
                    </span>
                </button>
            ))}
        </div>
    );
}
