"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { ImportanceBadge } from "./importance-badge";
import type { Message } from "@/lib/mock-data";

interface NewMessageToastItem {
    id: string;
    message: Message;
}

interface NewMessageToastProps {
    toasts: NewMessageToastItem[];
    onDismiss: (id: string) => void;
    onOpen: (message: Message) => void;
}

export function NewMessageToast({ toasts, onDismiss, onOpen }: NewMessageToastProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 340 }}>
            {toasts.map(({ id, message }) => (
                <div
                    key={id}
                    className={cn(
                        "pointer-events-auto bg-card border border-border rounded-lg shadow-xl p-3.5",
                        "flex items-start gap-3 cursor-pointer",
                        "animate-in slide-in-from-bottom-4 fade-in duration-300"
                    )}
                    onClick={() => { onOpen(message); onDismiss(id); }}
                >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {message.sender.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-xs font-bold text-foreground truncate">{message.sender}</span>
                            <ImportanceBadge score={message.importance_score} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {(message.subject || message.content).slice(0, 50)}
                            {(message.subject || message.content).length > 50 ? "…" : ""}
                        </p>
                    </div>

                    {/* Dismiss */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDismiss(id); }}
                        className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
