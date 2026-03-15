"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/mock-data";
import { ImportanceBadge } from "./importance-badge";
import { SourceIcon, SOURCE_CONFIG } from "./source-filter";
import { AIActionsPanel } from "./ai-actions-panel";
import { Sparkles, Send, RefreshCw, X, Copy, CheckCheck, Loader2, Archive, Eye, EyeOff, Paperclip } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { sendEmail, archiveEmail, markEmailStatus, type EmailAttachment } from "@/lib/gmail";
import { auth } from "@/lib/firebase";

interface AIDraftPanelProps {
    message: Message | null;
    onClose: () => void;
    onArchived?: (message: Message) => void;
    onStatusChanged?: (message: Message, status: "read" | "unread") => void;
    onReplied?: (message: Message) => void;
    className?: string;
}

export function AIDraftPanel({ message, onClose, onArchived, onStatusChanged, onReplied, className }: AIDraftPanelProps) {
    const [draftText, setDraftText] = useState(message?.ai_draft_response || "");
    const [copied, setCopied] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isReplying, setIsReplying] = useState(false);
    const [draftError, setDraftError] = useState<string | null>(null);
    // Reply compose fields
    const [replyTo, setReplyTo] = useState("");
    const [replyCc, setReplyCc] = useState("");
    const [replyBcc, setReplyBcc] = useState("");
    const [replySubject, setReplySubject] = useState("");
    const [showCcBcc, setShowCcBcc] = useState(false);
    // Attachments
    const [attachments, setAttachments] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const initReply = (msg: typeof message) => {
        if (!msg) return;
        setReplyTo(msg.senderEmail ?? msg.sender);
        const subj = msg.subject ?? "";
        setReplySubject(subj.toLowerCase().startsWith("re:") ? subj : `Re: ${subj}`);
        setReplyCc("");
        setReplyBcc("");
        setShowCcBcc(false);
    };

    useEffect(() => {
        setIsReplying(false);
        setDraftError(null);
        setSendSuccess(false);
        setAttachments([]);
        setDraftText(message?.ai_draft_response || "");
        setSuggestions([]);
    }, [message?.id, message?.ai_draft_response]);

    // Listen for keyboard shortcut 'r' dispatched by the dashboard
    useEffect(() => {
        const handler = () => {
            if (!message) return;
            initReply(message);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            setDraftError("Senden ist derzeit nur für verbundene Gmail-Konten implementiert.");
            return;
        }
        if (!message.accountId) {
            setDraftError("Kein Gmail-Konto für diese Nachricht gefunden.");
            return;
        }
        if (!replyTo.trim()) {
            setDraftError("Bitte gib einen Empfänger an.");
            return;
        }
        if (!draftText.trim()) {
            setDraftError("Die Nachricht darf nicht leer sein.");
            return;
        }

        setIsSending(true);
        setDraftError(null);
        try {
            // Convert File objects to base64 EmailAttachments
            const encodedAttachments: EmailAttachment[] = await Promise.all(
                attachments.map(
                    (file) =>
                        new Promise<EmailAttachment>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const result = reader.result as string;
                                // result is "data:mimeType;base64,BASE64DATA"
                                const base64 = result.split(",")[1] ?? "";
                                resolve({ filename: file.name, mimeType: file.type || "application/octet-stream", data: base64 });
                            };
                            reader.onerror = () => reject(reader.error);
                            reader.readAsDataURL(file);
                        })
                )
            );

            await sendEmail(
                auth.currentUser.uid,
                message.accountId,
                replyTo.trim(),
                replySubject,
                draftText,
                message.rfcMessageId || undefined,
                message.rfcMessageId || undefined,
                message.threadId,
                replyCc.trim() || undefined,
                replyBcc.trim() || undefined,
                encodedAttachments.length > 0 ? encodedAttachments : undefined
            );

            // Record interaction signal for AI memory (best-effort, non-blocking)
            auth.currentUser?.getIdToken().then(idToken => {
                const keywords = [message.subject, message.sender].filter(Boolean).join(" ")
                    .split(/\s+/)
                    .filter(w => w.length > 4)
                    .slice(0, 5);
                fetch("/api/user/memory", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify({
                        signal: {
                            repliedToEmail: message.senderEmail ?? undefined,
                            engagedTopics: keywords,
                            draftStyle: {
                                length: draftText.length < 200 ? "short" : draftText.length < 500 ? "medium" : "long",
                            },
                        },
                    }),
                }).catch(() => {}); // fire-and-forget
            }).catch(() => {});

            // Optimistic feedback: show success state, notify parent, then reset reply area
            setSendSuccess(true);
            onReplied?.(message);
            setTimeout(() => {
                setSendSuccess(false);
                setIsReplying(false);
                setAttachments([]);
                setDraftText(message.ai_draft_response || "");
            }, 2000);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
            setDraftError(`Fehler beim Senden: ${msg}`);
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
            setDraftError(`Fehler beim Archivieren: ${msg}`);
        } finally {
            setIsArchiving(false);
        }
    };

    const handleGenerateDraft = async () => {
        if (!message) return;
        setIsGenerating(true);
        setDraftError(null);
        // If this is a regeneration (draft already exists), record interaction signal
        const isRegeneration = draftText.trim().length > 0;
        try {
            const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

            const res = await fetch("/api/ai/draft", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    subject: message.subject,
                    sender: message.sender,
                    senderEmail: message.senderEmail,
                    body: message.content,
                    idToken,
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
            if (!isReplying) {
                initReply(message);
                setIsReplying(true);
            }
            setTimeout(() => textareaRef.current?.focus(), 50);

            // Record regeneration signal for user memory (fire-and-forget)
            if (isRegeneration && idToken) {
                void fetch("/api/user/memory", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify({ regenerated: true }),
                }).catch(() => undefined);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "AI-Draft nicht verfügbar: Unbekannter Fehler.";
            setDraftError(msg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleLoadSuggestions = async () => {
        if (!message) return;
        setIsLoadingSuggestions(true);
        setDraftError(null);
        setSuggestions([]);
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
            if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
            const res = await fetch("/api/ai/suggestions", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    subject: message.subject,
                    sender: message.sender,
                    senderEmail: message.senderEmail,
                    body: message.content,
                }),
            });
            const data = (await res.json()) as { suggestions?: string[]; error?: string };
            if (!res.ok) throw new Error(data.error ?? "Generation failed");
            setSuggestions(data.suggestions ?? []);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
            setDraftError(msg);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const handlePickSuggestion = (suggestion: string) => {
        setDraftText(suggestion);
        setSuggestions([]);
        if (!isReplying) {
            initReply(message!);
            setIsReplying(true);
        }
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    const handleToggleRead = async () => {
        if (!auth.currentUser || !message || message.source !== "gmail") return;
        const newStatus = message.status === "unread" ? "read" : "unread";
        try {
            await markEmailStatus(auth.currentUser.uid, message.accountId ?? "", message.id, newStatus);
            onStatusChanged?.(message, newStatus);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
            setDraftError(`Fehler: ${msg}`);
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
            <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-border">
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

            {/* Sender & Meta — fixed, does not scroll */}
            <div className="flex-shrink-0 p-3 border-b border-border/40">
                {/* Sender & Importance */}
                <div className="space-y-3">
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
                                        initReply(message);
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

            </div>

            {/* Email Body — flex-1, fills all available space, scrolls independently */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                <div className="flex-1 flex flex-col p-3">
                    {/* Full Content - Sharp Document Sheet Effect */}
                    <div className="relative flex-1 flex flex-col group">
                        {/* Hard drop shadow effect for kantiger design */}
                        <div className="absolute inset-0 bg-black/5 dark:bg-white/5 transform translate-y-1 translate-x-1 z-0" />
                        <div className="relative bg-background border border-border shadow-sm p-4 sm:p-5 z-10 transition-all flex-1 flex flex-col">
                            {message.htmlContent ? (
                                <iframe
                                    srcDoc={message.htmlContent}
                                    sandbox=""
                                    className="w-full flex-1 border-0 rounded"
                                    style={{ minHeight: "200px" }}
                                    title="Email content"
                                />
                            ) : (
                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium flex-1">{message.content}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Actions — between body and reply compose */}
            <AIActionsPanel message={message} />

            {/* Reply Compose — expands when replying, compact otherwise */}
            <div className={cn(
                "flex-shrink-0 border-t border-border flex flex-col",
                isReplying ? "max-h-[50%] overflow-y-auto" : "max-h-[220px] overflow-y-auto"
            )}>
                {/* Draft Error Banner */}
                {draftError && (
                    <div className="mx-3 mt-2 p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md flex items-start gap-2 shrink-0">
                        <span className="shrink-0 mt-0.5">⚠</span>
                        <span>{draftError}</span>
                    </div>
                )}

                {/* Full Reply Compose Panel */}
                {isReplying && (
                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Reply fields */}
                        <div className="border-b border-border/50 shrink-0">
                            {/* To */}
                            <div className="flex items-center px-3 py-2 border-b border-border/30 group">
                                <label className="text-[11px] font-semibold text-muted-foreground w-10 shrink-0 group-focus-within:text-primary transition-colors">An:</label>
                                <input
                                    type="text"
                                    value={replyTo}
                                    onChange={(e) => setReplyTo(e.target.value)}
                                    className="flex-1 bg-transparent text-xs font-medium focus:outline-none text-foreground placeholder:text-muted-foreground"
                                    placeholder="Empfänger"
                                />
                                <button
                                    onClick={() => setShowCcBcc(v => !v)}
                                    className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
                                >
                                    CC/BCC
                                </button>
                            </div>

                            {/* CC / BCC (toggled) */}
                            {showCcBcc && (
                                <>
                                    <div className="flex items-center px-3 py-2 border-b border-border/30 group">
                                        <label className="text-[11px] font-semibold text-muted-foreground w-10 shrink-0 group-focus-within:text-primary transition-colors">CC:</label>
                                        <input
                                            type="text"
                                            value={replyCc}
                                            onChange={(e) => setReplyCc(e.target.value)}
                                            className="flex-1 bg-transparent text-xs font-medium focus:outline-none text-foreground placeholder:text-muted-foreground"
                                            placeholder="CC-Empfänger"
                                        />
                                    </div>
                                    <div className="flex items-center px-3 py-2 border-b border-border/30 group">
                                        <label className="text-[11px] font-semibold text-muted-foreground w-10 shrink-0 group-focus-within:text-primary transition-colors">BCC:</label>
                                        <input
                                            type="text"
                                            value={replyBcc}
                                            onChange={(e) => setReplyBcc(e.target.value)}
                                            className="flex-1 bg-transparent text-xs font-medium focus:outline-none text-foreground placeholder:text-muted-foreground"
                                            placeholder="BCC-Empfänger"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Subject */}
                            <div className="flex items-center px-3 py-2 group">
                                <label className="text-[11px] font-semibold text-muted-foreground w-10 shrink-0 group-focus-within:text-primary transition-colors">Betr.:</label>
                                <input
                                    type="text"
                                    value={replySubject}
                                    onChange={(e) => setReplySubject(e.target.value)}
                                    className="flex-1 bg-transparent text-xs font-semibold focus:outline-none text-foreground placeholder:text-muted-foreground"
                                    placeholder="Betreff"
                                />
                            </div>
                        </div>

                        {/* AI Reply Suggestions — shown above textarea when available */}
                        {suggestions.length > 0 && (
                            <div className="px-3 pt-2 pb-1 space-y-1.5">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                    Vorschläge — klicken zum Auswählen
                                </p>
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handlePickSuggestion(s)}
                                        className={cn(
                                            "w-full text-left text-[11px] leading-relaxed px-3 py-2 rounded-sm border",
                                            "border-border/60 bg-muted/20 hover:bg-primary/5 hover:border-primary/40",
                                            "text-foreground transition-all"
                                        )}
                                    >
                                        {s.length > 160 ? s.slice(0, 160) + "…" : s}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Body textarea */}
                        <div className="flex-1 min-h-0 px-3 pt-2 pb-1">
                            <textarea
                                ref={textareaRef}
                                value={draftText}
                                onChange={(e) => setDraftText(e.target.value)}
                                className={cn(
                                    "w-full h-full min-h-[100px] bg-transparent",
                                    "text-sm text-foreground placeholder:text-muted-foreground leading-relaxed",
                                    "focus:outline-none resize-none"
                                )}
                                placeholder="Schreib deine Antwort..."
                            />
                        </div>

                        {/* Attachment list */}
                        {attachments.length > 0 && (
                            <div className="px-3 pb-1 flex flex-wrap gap-1.5">
                                {attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-1 rounded-sm border border-border/60 bg-muted/40 px-2 py-1 text-[10px] font-medium text-foreground max-w-[180px]">
                                        <Paperclip className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                                        <span className="truncate">{file.name}</span>
                                        <button
                                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                            className="shrink-0 ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/10 shrink-0">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleGenerateDraft}
                                    disabled={isGenerating || isLoadingSuggestions || sendSuccess}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-medium",
                                        "text-primary hover:bg-primary/5 hover:border-primary/40 transition-all shadow-sm",
                                        "disabled:opacity-50 disabled:pointer-events-none"
                                    )}
                                >
                                    {isGenerating
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <Sparkles className="h-3 w-3" />}
                                    {isGenerating ? "Generiere..." : "KI Entwurf"}
                                </button>
                                <button
                                    onClick={handleLoadSuggestions}
                                    disabled={isGenerating || isLoadingSuggestions || sendSuccess}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-medium",
                                        "text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/40 transition-all shadow-sm",
                                        "disabled:opacity-50 disabled:pointer-events-none"
                                    )}
                                    title="3 Vorschläge generieren"
                                >
                                    {isLoadingSuggestions
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <Sparkles className="h-3 w-3" />}
                                    {isLoadingSuggestions ? "..." : "3 Vorschläge"}
                                </button>
                                <button
                                    onClick={handleCopy}
                                    disabled={sendSuccess}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-medium",
                                        "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shadow-sm",
                                        "disabled:opacity-50 disabled:pointer-events-none"
                                    )}
                                >
                                    {copied ? <CheckCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                    {copied ? "Kopiert" : "Kopieren"}
                                </button>
                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files ?? []);
                                        setAttachments(prev => [...prev, ...files]);
                                        // Reset so same file can be re-added
                                        e.target.value = "";
                                    }}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={sendSuccess}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-medium",
                                        "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shadow-sm",
                                        "disabled:opacity-50 disabled:pointer-events-none"
                                    )}
                                    title="Datei anhängen"
                                >
                                    <Paperclip className="h-3 w-3" />
                                    {attachments.length > 0 ? `${attachments.length}` : ""}
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {sendSuccess ? (
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        <CheckCheck className="h-3 w-3" />
                                        Gesendet!
                                    </span>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => { setIsReplying(false); setAttachments([]); }}
                                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Abbrechen
                                        </button>
                                        <button
                                            onClick={handleSend}
                                            disabled={isSending}
                                            className={cn(
                                                "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[11px] font-semibold transition-all",
                                                "bg-primary text-primary-foreground hover:bg-primary/90",
                                                "shadow-sm active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none"
                                            )}
                                        >
                                            {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                            {isSending ? "Senden..." : "Senden"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Draft Section (when not in full reply mode) */}
                {!isReplying && message.ai_draft_response && (
                    <div className="p-3 space-y-3">
                        <div className="flex items-center gap-1.5">
                            <div className="h-7 w-7 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground tracking-tight">AI Draft Response</h3>
                        </div>
                        <div className="relative group">
                            <textarea
                                ref={textareaRef}
                                value={draftText}
                                onChange={(e) => setDraftText(e.target.value)}
                                className={cn(
                                    "w-full min-h-[80px] rounded-sm border border-border/80 bg-muted/30 p-3",
                                    "text-sm text-foreground placeholder:text-muted-foreground leading-relaxed",
                                    "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:bg-background",
                                    "resize-y transition-all shadow-sm"
                                )}
                            />
                        </div>
                        <div className="flex items-center gap-2">
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
                    <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">AI-Entwurf generieren</span>
                        <button
                            onClick={handleGenerateDraft}
                            disabled={isGenerating}
                            className={cn(
                                "flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-medium",
                                "text-primary hover:bg-primary/5 hover:border-primary/40 transition-all shadow-sm",
                                "disabled:opacity-50 disabled:pointer-events-none"
                            )}
                        >
                            {isGenerating
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Sparkles className="h-3 w-3" />}
                            {isGenerating ? "Generiere..." : "Generate Draft"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
