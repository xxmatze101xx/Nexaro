"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/mock-data";
import { ImportanceBadge } from "./importance-badge";
import { SourceIcon, SOURCE_CONFIG } from "./source-filter";
import { Sparkles, Send, RefreshCw, X, Copy, CheckCheck } from "lucide-react";
import { useState } from "react";

interface AIDraftPanelProps {
    message: Message | null;
    onClose: () => void;
    className?: string;
}

export function AIDraftPanel({ message, onClose, className }: AIDraftPanelProps) {
    const [draftText, setDraftText] = useState(message?.ai_draft_response || "");
    const [copied, setCopied] = useState(false);

    if (!message) {
        return (
            <div
                className={cn(
                    "flex flex-col items-center justify-center h-full text-center p-8 border-l border-border bg-card",
                    className
                )}
            >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Message Selected</h3>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                    Select a message from your inbox to view details and AI-drafted responses.
                </p>
            </div>
        );
    }

    const sourceConfig = SOURCE_CONFIG[message.source];

    const handleCopy = () => {
        navigator.clipboard.writeText(draftText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className={cn(
                "flex flex-col h-full border-l border-border bg-card",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <SourceIcon source={message.source} size="sm" />
                    <span className="text-xs font-medium text-muted-foreground">
                        {sourceConfig?.label || message.source}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </button>
            </div>

            {/* Message Detail */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Sender & Importance */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-foreground">{message.sender}</h2>
                        <ImportanceBadge score={message.importance_score} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleString()}
                    </p>
                </div>

                {/* Full Content */}
                <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-foreground leading-relaxed">{message.content}</p>
                </div>

                {/* AI Draft Section */}
                {message.ai_draft_response && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">AI Draft Response</h3>
                        </div>
                        <textarea
                            value={draftText}
                            onChange={(e) => setDraftText(e.target.value)}
                            className={cn(
                                "w-full min-h-[120px] rounded-lg border border-border bg-background p-3",
                                "text-sm text-foreground placeholder:text-muted-foreground",
                                "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                                "resize-none transition-all"
                            )}
                        />
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                className={cn(
                                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                                    "bg-primary text-primary-foreground hover:bg-primary-hover",
                                    "shadow-sm hover:shadow active:scale-95"
                                )}
                            >
                                <Send className="h-3.5 w-3.5" />
                                Send Reply
                            </button>
                            <button
                                className={cn(
                                    "flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium",
                                    "text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
                                    "active:scale-95"
                                )}
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Regenerate
                            </button>
                            <button
                                onClick={handleCopy}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium",
                                    "text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
                                    "active:scale-95"
                                )}
                            >
                                {copied ? <CheckCheck className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                    </div>
                )}

                {!message.ai_draft_response && (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center">
                        <Sparkles className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                            No AI draft available for this message.
                        </p>
                        <button
                            className={cn(
                                "mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
                                "bg-primary text-primary-foreground hover:bg-primary-hover",
                                "shadow-sm hover:shadow active:scale-95 transition-all"
                            )}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Generate Draft
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
