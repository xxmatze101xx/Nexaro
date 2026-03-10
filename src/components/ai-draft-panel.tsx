"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/mock-data";
import { ImportanceBadge } from "./importance-badge";
import { SourceIcon, SOURCE_CONFIG } from "./source-filter";
import { Sparkles, Send, RefreshCw, X, Copy, CheckCheck, Loader2, Archive, Eye, EyeOff } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { sendEmail, archiveEmail, markEmailStatus } from "@/lib/gmail";
import { auth } from "@/lib/firebase";

interface AIDraftPanelProps {
    message: Message | null;
    onClose: () => void;
    onArchived?: (message: Message) => void;
    onStatusChanged?: (message: Message, status: "read" | "unread") => void;
    className?: string;
}

export function AIDraftPanel({ message, onClose, onArchived, onStatusChanged, className }: AIDraftPanelProps) {
    const [draftText, setDraftText] = useState(message?.ai_draft_response || "");
    const [copied, setCopied] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [draftError, setDraftError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setIsReplying(false);
        setDraftError(null);
        setDraftText(message?.ai_draft_response || "");
    }, [message?.id, message?.ai_draft_response]);

    // Listen for keyboard shortcut 'r' dispatched by the dashboard
    useEffect(() => {
        const handler = () => {
            if (!message) return;
            if (!draftText) {
                // UX-V3: auto-fill greeting if no draft exists
                const firstName = message.sender.split(/[\s,]+/)[0] ?? message.sender;
                setDraftText(`Guten Tag ${firstName},\n\n\n\nMit freundlichen Grüßen`);
            }
            setIsReplying(true);
            setTimeout(() => textareaRef.current?.focus(), 50);
        };
        document.addEventListener("nexaro:reply", handler);
        return () => document.removeEventListener("nexaro:reply", handler);
    }, [message, draftText]);

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

    const handleSend = async () => {
        if (!auth.currentUser || !message || message.source !== "gmail") {
            alert("Senden ist derzeit nur für verbundene Gmail-Konten implementiert.");
            return;
        }

        setIsSending(true);
        try {
            const originalSubject = message.subject || "Nachricht";
            const replySubject = originalSubject.toLowerCase().startsWith("re:")
                ? originalSubject
                : `Re: ${originalSubject}`;

            // Use the RFC Message-ID header (e.g. <xxxx@mail.gmail.com>) for
            // In-Reply-To / References so Gmail threads the reply correctly.
            // Pass threadId so Gmail places it in the existing thread.
            await sendEmail(
                auth.currentUser.uid,
                message.accountId ?? "",
                message.senderEmail ?? message.sender,
                replySubject,
                draftText,
                message.rfcMessageId,
                message.rfcMessageId,
                message.threadId
            );
            alert("E-Mail erfolgreich gesendet!");
            onClose();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
            alert(`Fehler beim Senden: ${msg}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleArchive = async () => {
        if (!auth.currentUser || !message || message.source !== "gmail") return;
        setIsArchiving(true);
        try {
            await archiveEmail(auth.currentUser.uid, message.accountId ?? "", message.id);
            onArchived?.(message);
            onClose();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
            alert(`Fehler beim Archivieren: ${msg}`);
        } finally {
            setIsArchiving(false);
        }
    };

    const handleGenerateDraft = async () => {
        if (!message) return;
        setIsGenerating(true);
        setDraftError(null);
        try {
            const res = await fetch("/api/ai/draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: message.subject,
                    sender: message.sender,
                    senderEmail: message.senderEmail,
                    body: message.content,
                }),
            });
            const data = (await res.json()) as { draft?: string; error?: string };
            if (!res.ok) {
                const errMsg = data.error ?? "Generation failed";
                if (errMsg.toLowerCase().includes("api key") || errMsg.toLowerCase().includes("gemini")) {
                    throw new Error("AI-Draft nicht verfügbar: Kein API-Key konfiguriert. Bitte GEMINI_API_KEY in .env.local eintragen.");
                }
                throw new Error(errMsg);
            }
            setDraftText(data.draft ?? "");
            setIsReplying(true);
            setTimeout(() => textareaRef.current?.focus(), 50);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "AI-Draft nicht verfügbar: Unbekannter Fehler.";
            setDraftError(msg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleToggleRead = async () => {
        if (!auth.currentUser || !message || message.source !== "gmail") return;
        const newStatus = message.status === "unread" ? "read" : "unread";
        try {
            await markEmailStatus(auth.currentUser.uid, message.accountId ?? "", message.id, newStatus);
            onStatusChanged?.(message, newStatus);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
            alert(`Fehler: ${msg}`);
        }
    };

    return (
        <div
            className={cn(
                "flex flex-col h-full border-l border-border bg-card",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
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
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Sender & Importance */}
                <div className="space-y-3 mb-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="shrink-0 mt-0.5">
                                <div className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center text-base font-bold text-white shadow-md",
                                    message.sender.length % 3 === 0 ? "bg-gradient-to-br from-indigo-500 to-purple-500" :
                                        message.sender.length % 3 === 1 ? "bg-gradient-to-br from-blue-500 to-cyan-500" :
                                            "bg-gradient-to-br from-emerald-400 to-teal-500"
                                )}>
                                    {message.sender.charAt(0).toUpperCase()}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="flex flex-col gap-0.5">
                                {message.subject && (
                                    <h2 className="text-lg font-bold text-foreground leading-tight tracking-tight">
                                        {message.subject}
                                    </h2>
                                )}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-semibold text-foreground/90">
                                        {message.sender}
                                    </span>
                                    {message.senderEmail && (
                                        <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                                            {message.senderEmail}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground/80 font-medium mt-1">
                                    {new Date(message.timestamp).toLocaleString(undefined, {
                                        dateStyle: 'full',
                                        timeStyle: 'short'
                                    })}
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 mt-1 flex flex-col items-end gap-2">
                            <ImportanceBadge score={message.importance_score} />

                            {/* Quick Actions at Top Right */}
                            <div className="flex items-center gap-1 mt-1">
                                <button
                                    title="Reply"
                                    className="px-3 py-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50 hover:border-border transition-all shadow-sm bg-background flex items-center gap-1.5"
                                    onClick={() => {
                                        if (!draftText) {
                                            const firstName = message.sender.split(/[\s,]+/)[0] ?? message.sender;
                                            setDraftText(`Guten Tag ${firstName},\n\n\n\nMit freundlichen Grüßen`);
                                        }
                                        setIsReplying(true);
                                        setTimeout(() => {
                                            textareaRef.current?.focus();
                                        }, 50);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                                    <span className="text-xs font-semibold">Reply</span>
                                </button>
                                <button
                                    title="Archivieren"
                                    disabled={isArchiving}
                                    className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50 hover:border-border transition-all shadow-sm bg-background disabled:opacity-50"
                                    onClick={handleArchive}
                                >
                                    {isArchiving
                                        ? <Loader2 width="15" height="15" className="animate-spin" />
                                        : <Archive width="15" height="15" />}
                                </button>
                                <button
                                    title={message.status === "unread" ? "Als gelesen markieren" : "Als ungelesen markieren"}
                                    className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50 hover:border-border transition-all shadow-sm bg-background"
                                    onClick={handleToggleRead}
                                >
                                    {message.status === "unread"
                                        ? <Eye width="15" height="15" />
                                        : <EyeOff width="15" height="15" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Full Content - Sharp Document Sheet Effect */}
                <div className="relative mt-4 mb-6 group">
                    {/* Hard drop shadow effect for kantiger design */}
                    <div className="absolute inset-0 bg-black/5 dark:bg-white/5 transform translate-y-1 translate-x-1 z-0" />
                    <div className="relative bg-background border border-border shadow-sm p-4 sm:p-5 z-10 transition-all">
                        {message.htmlContent ? (
                            <iframe
                                srcDoc={message.htmlContent}
                                sandbox=""
                                className="w-full min-h-[300px] h-full flex-1 border-0 rounded"
                                style={{ minHeight: "300px", height: "auto" }}
                                onLoad={(e) => {
                                    const iframe = e.currentTarget;
                                    try {
                                        const h = iframe.contentDocument?.documentElement?.scrollHeight;
                                        if (h) iframe.style.height = `${Math.min(h, 600)}px`;
                                    } catch { /* cross-origin */ }
                                }}
                                title="Email content"
                            />
                        ) : (
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                        )}
                    </div>
                </div>

                {/* Draft Error Banner */}
                {draftError && (
                    <div className="mx-0 mt-2 mb-2 p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md flex items-start gap-2">
                        <span className="shrink-0 mt-0.5">⚠</span>
                        <span>{draftError}</span>
                    </div>
                )}

                {/* AI Draft Section */}
                {(message.ai_draft_response || isReplying) && (
                    <div className="space-y-3 pt-3 border-t border-border/40">
                        <div className="flex items-center gap-1.5">
                            <div className="h-7 w-7 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground tracking-tight">
                                {message.ai_draft_response ? "AI Draft Response" : "Your Reply"}
                            </h3>
                        </div>
                        <div className="relative group">
                            <textarea
                                ref={textareaRef}
                                value={draftText}
                                onChange={(e) => setDraftText(e.target.value)}
                                className={cn(
                                    "w-full min-h-[120px] rounded-sm border border-border/80 bg-muted/30 p-3",
                                    "text-sm text-foreground placeholder:text-muted-foreground leading-relaxed",
                                    "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:bg-background",
                                    "resize-y transition-all shadow-sm"
                                )}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1.5">
                            <button
                                onClick={handleSend}
                                disabled={isSending}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-semibold transition-all",
                                    "bg-primary text-primary-foreground hover:bg-primary/90",
                                    "shadow-sm hover:shadow active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none",
                                    "border border-primary"
                                )}
                            >
                                {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                {isSending ? "Sending..." : "Send Reply"}
                            </button>
                            <button
                                onClick={handleGenerateDraft}
                                disabled={isGenerating}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-3 py-2 text-xs font-medium",
                                    "text-foreground hover:bg-muted/50 hover:border-border transition-all shadow-sm",
                                    "active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none"
                                )}
                            >
                                {isGenerating
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                    : <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />}
                                {isGenerating ? "Generating..." : "Regenerate"}
                            </button>
                            <button
                                onClick={handleCopy}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-3 py-2 text-xs font-medium",
                                    "text-foreground hover:bg-muted/50 hover:border-border transition-all shadow-sm",
                                    "active:translate-y-[1px] ml-auto"
                                )}
                            >
                                {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                                {copied ? "Copied" : "Copy Draft"}
                            </button>
                        </div>
                    </div>
                )}

                {!message.ai_draft_response && !isReplying && (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center">
                        <Sparkles className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                            No AI draft available for this message.
                        </p>
                        <button
                            onClick={handleGenerateDraft}
                            disabled={isGenerating}
                            className={cn(
                                "mt-3 inline-flex items-center gap-1.5 rounded-sm px-4 py-2 text-xs font-semibold",
                                "bg-primary text-primary-foreground hover:bg-primary/90",
                                "shadow-sm hover:shadow active:scale-95 transition-all text-sm",
                                "disabled:opacity-50 disabled:pointer-events-none"
                            )}
                        >
                            {isGenerating
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Sparkles className="h-3.5 w-3.5" />}
                            {isGenerating ? "Generating..." : "Generate Draft"}
                        </button>
                    </div>
                )}
                {/* UX-V3: Reply with greeting when opening reply without AI draft */}
            </div>
        </div>
    );
}
