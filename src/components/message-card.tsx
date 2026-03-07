"use client";

import { cn } from "@/lib/utils";
import { ImportanceBadge } from "./importance-badge";
import { SourceIcon } from "./source-filter";
import type { Message } from "@/lib/mock-data";
import { Sparkles, Clock, CheckCheck, Archive, Eye, EyeOff } from "lucide-react";

interface MessageCardProps {
    message: Message;
    isSelected: boolean;
    onSelect: (message: Message) => void;
    onArchive?: (message: Message) => void;
    onToggleRead?: (message: Message) => void;
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

export function MessageCard({ message, isSelected, onSelect, onArchive, onToggleRead, className }: MessageCardProps) {
    return (
        <button
            onClick={() => onSelect(message)}
            className={cn(
                "group w-full text-left p-2.5 transition-all duration-200",
                "border-b border-border/50",
                "hover:bg-muted/40 relative",
                "active:bg-muted/60",
                isSelected
                    ? "bg-primary/[0.04] border-l-[3px] border-l-primary shadow-[inset_0_1px_0_hsl(var(--primary)/0.05)]"
                    : "bg-background border-l-[3px] border-l-transparent",
                message.status === "unread" && !isSelected && "bg-muted/10 border-l-primary/40",
                className
            )}
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                    <div className={cn(
                        "w-7 h-7 flex items-center justify-center text-xs font-bold text-white shadow-sm rounded-sm",
                        // Generate a consistent but clean gradient based on the sender's name length (simple trick)
                        message.sender.length % 3 === 0 ? "bg-slate-700" :
                            message.sender.length % 3 === 1 ? "bg-zinc-700" :
                                "bg-stone-700"
                    )}>
                        {message.sender.charAt(0).toUpperCase()}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-8">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                            {message.status === "unread" && (
                                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                            )}
                            <span
                                className={cn(
                                    "text-sm truncate",
                                    message.status === "unread" ? "font-bold text-foreground" : "font-semibold text-foreground/80"
                                )}
                            >
                                {message.sender}
                            </span>
                        </div>
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

                    {/* Subject (if available) */}
                    {message.subject && (
                        <h4
                            className={cn(
                                "text-xs font-medium line-clamp-1 mb-1.5",
                                message.status === "unread" ? "text-foreground" : "text-foreground/90"
                            )}
                        >
                            {message.subject}
                        </h4>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1">
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

            {/* Quick Actions (Hover) */}
            <div className="absolute right-2 top-2.5 flex flex-col gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200">
                <button
                    title="Archivieren"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/50 transition-all bg-background"
                    onClick={(e) => {
                        e.stopPropagation();
                        onArchive?.(message);
                    }}
                >
                    <Archive className="h-3.5 w-3.5" />
                </button>
                <button
                    title={message.status === "unread" ? "Als gelesen markieren" : "Als ungelesen markieren"}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/50 transition-all bg-background"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleRead?.(message);
                    }}
                >
                    {message.status === "unread"
                        ? <Eye className="h-3.5 w-3.5" />
                        : <EyeOff className="h-3.5 w-3.5" />}
                </button>
            </div>
        </button>
    );
}
