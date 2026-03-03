"use client";

import { cn } from "@/lib/utils";
import { ImportanceBadge } from "./importance-badge";
import { SourceIcon } from "./source-filter";
import type { Message } from "@/lib/mock-data";
import { Sparkles, Clock, CheckCheck } from "lucide-react";

interface MessageCardProps {
    message: Message;
    isSelected: boolean;
    onSelect: (message: Message) => void;
    className?: string;
}

function timeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getStatusIcon(status: string) {
    switch (status) {
        case "unread":
            return <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />;
        case "read":
            return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
        case "replied":
            return <CheckCheck className="h-3.5 w-3.5 text-success" />;
        default:
            return null;
    }
}

export function MessageCard({ message, isSelected, onSelect, className }: MessageCardProps) {
    return (
        <button
            onClick={() => onSelect(message)}
            className={cn(
                "group w-full text-left rounded-xl border p-4 transition-all duration-200",
                "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
                "active:translate-y-0 active:shadow-sm",
                isSelected
                    ? "border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card",
                message.status === "unread" && !isSelected && "border-l-2 border-l-primary",
                className
            )}
        >
            <div className="flex items-start gap-3">
                {/* Source Icon */}
                <SourceIcon source={message.source} size="md" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                            className={cn(
                                "text-sm truncate",
                                message.status === "unread" ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                            )}
                        >
                            {message.sender}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                            {message.ai_draft_response && (
                                <Sparkles className="h-3.5 w-3.5 text-primary opacity-60" />
                            )}
                            {getStatusIcon(message.status)}
                            <span className="text-xs text-muted-foreground">
                                <Clock className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                                {timeAgo(message.timestamp)}
                            </span>
                        </div>
                    </div>

                    {/* Content Preview */}
                    <p
                        className={cn(
                            "text-sm line-clamp-2 mb-2",
                            message.status === "unread" ? "text-foreground/90" : "text-muted-foreground"
                        )}
                    >
                        {message.content}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                        <ImportanceBadge score={message.importance_score} />
                        {message.ai_draft_response && (
                            <span className="text-xs text-primary/70 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                AI Draft Ready
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}
