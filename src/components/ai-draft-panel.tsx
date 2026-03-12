"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/mock-data";
import { ImportanceBadge } from "./importance-badge";
import { SourceIcon, SOURCE_CONFIG } from "./source-filter";
import { Sparkles, Send, RefreshCw, X, Copy, CheckCheck, Loader2, Archive, Eye, EyeOff, Paperclip, Image as ImageIcon, FileText, File as FileIcon, ListTodo, Check } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { sendEmail, archiveEmail, markEmailStatus, fileToAttachment, MAX_ATTACHMENT_SIZE, type EmailAttachment } from "@/lib/gmail";
import { auth } from "@/lib/firebase";
import { addTodo } from "@/lib/todos";

interface ExtractedTodoItem {
    title: string;
    priority: "low" | "medium" | "high" | "urgent";
    deadline: string | null;
    confidence: number;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
    // Reply compose fields
    const [replyTo, setReplyTo] = useState("");
    const [replyCc, setReplyCc] = useState("");
    const [replyBcc, setReplyBcc] = useState("");
    const [replySubject, setReplySubject] = useState("");
    const [showCcBcc, setShowCcBcc] = useState(false);
    const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isExtractingTodos, setIsExtractingTodos] = useState(false);
    const [extractedTodos, setExtractedTodos] = useState<ExtractedTodoItem[]>([]);
    const [addedTodoIndices, setAddedTodoIndices] = useState<Set<number>>(new Set());
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const replyFileInputRef = useRef<HTMLInputElement>(null);

    const addFiles = useCallback(async (files: FileList | File[]) => {
        setDraftError(null);
        const fileArray = Array.from(files);
        const totalCurrentSize = attachments.reduce((s, a) => s + a.size, 0);
        const newTotalSize = totalCurrentSize + fileArray.reduce((s, f) => s + f.size, 0);
        if (newTotalSize > MAX_ATTACHMENT_SIZE) {
            setDraftError("Gesamtgröße überschreitet 25 MB. Bitte entferne Anhänge.");
            return;
        }
        try {
            const newAttachments = await Promise.all(fileArray.map(f => fileToAttachment(f)));
            setAttachments(prev => [...prev, ...newAttachments]);
        } catch (err: unknown) {
            setDraftError(err instanceof Error ? err.message : "Fehler beim Lesen der Datei.");
        }
    }, [attachments]);

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

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
        setDraftText(message?.ai_draft_response || "");
        setAttachments([]);
        setIsDragOver(false);
        setExtractedTodos([]);
        setAddedTodoIndices(new Set());
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
        if (!replyTo.trim()) {
            setDraftError("Bitte gib einen Empfänger an.");
            return;
        }
        if (!draftText.trim()) {
            setDraftError("Die Nachricht darf nicht leer sein.");
            return;
        }

        setIsSending(true);
        try {
            await sendEmail(
                auth.currentUser.uid,
                message.accountId ?? "",
                replyTo.trim(),
                replySubject,
                draftText,
                message.rfcMessageId,
                message.rfcMessageId,
                message.threadId,
                replyCc.trim() || undefined,
                replyBcc.trim() || undefined,
                attachments.length > 0 ? attachments : undefined
            );
            onClose();
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
            if (!isReplying) {
                initReply(message);
                setIsReplying(true);
            }
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
            setDraftError(`Fehler: ${msg}`);
        }
    };

    const handleExtractTodos = async () => {
        if (!message) return;
        setIsExtractingTodos(true);
        setDraftError(null);
        setExtractedTodos([]);
        setAddedTodoIndices(new Set());
        try {
            const res = await fetch("/api/ai/extract-todos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: message.subject,
                    sender: message.sender,
                    body: message.content,
                }),
            });
            const data = (await res.json()) as { todos?: ExtractedTodoItem[]; error?: string };
            if (!res.ok) {
                throw new Error(data.error ?? "Extraktion fehlgeschlagen");
            }
            setExtractedTodos(data.todos ?? []);
            if (!data.todos || data.todos.length === 0) {
                setDraftError("Keine Aufgaben in dieser Nachricht gefunden.");
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Fehler bei der Extraktion.";
            setDraftError(msg);
        } finally {
            setIsExtractingTodos(false);
        }
    };

    const handleAddExtractedTodo = async (todo: ExtractedTodoItem, index: number) => {
        if (!auth.currentUser || !message) return;
        try {
            await addTodo(auth.currentUser.uid, todo.title, {
                priority: todo.priority,
                deadline: todo.deadline ?? undefined,
                source: "ai_extracted",
                sourceMessageId: message.id,
                sourceMessageSubject: message.subject,
                sourceType: message.source as "gmail" | "slack" | "teams" | "outlook",
                aiConfidence: todo.confidence,
            });
            setAddedTodoIndices(prev => new Set(prev).add(index));
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Fehler beim Speichern.";
            setDraftError(msg);
        }
    };

    const handleAddAllTodos = async () => {
        for (let i = 0; i < extractedTodos.length; i++) {
            if (!addedTodoIndices.has(i)) {
                await handleAddExtractedTodo(extractedTodos[i], i);
            }
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
                                <button
                                    title="Aufgaben extrahieren"
                                    disabled={isExtractingTodos}
                                    className="p-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border/50 hover:border-primary/30 transition-all shadow-sm bg-background disabled:opacity-50"
                                    onClick={handleExtractTodos}
                                >
                                    {isExtractingTodos
                                        ? <Loader2 width="15" height="15" className="animate-spin" />
                                        : <ListTodo width="15" height="15" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Extracted Todos Panel */}
            {extractedTodos.length > 0 && (
                <div className="flex-shrink-0 border-b border-border/50 px-3 py-2 bg-primary/5">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                            <ListTodo className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-semibold text-foreground">
                                {extractedTodos.length} Aufgabe{extractedTodos.length !== 1 ? "n" : ""} gefunden
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {addedTodoIndices.size < extractedTodos.length && (
                                <button
                                    onClick={handleAddAllTodos}
                                    className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                                >
                                    Alle hinzufügen
                                </button>
                            )}
                            <button
                                onClick={() => setExtractedTodos([])}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                        {extractedTodos.map((todo, idx) => {
                            const isAdded = addedTodoIndices.has(idx);
                            return (
                                <div key={idx} className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs",
                                    isAdded ? "bg-primary/10" : "bg-card border border-border/50",
                                )}>
                                    <span className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        todo.priority === "urgent" ? "bg-destructive" :
                                        todo.priority === "high" ? "bg-orange-500" :
                                        todo.priority === "medium" ? "bg-yellow-500" : "bg-muted-foreground/50",
                                    )} />
                                    <span className={cn("flex-1 truncate", isAdded && "text-muted-foreground line-through")}>
                                        {todo.title}
                                    </span>
                                    {todo.deadline && (
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {new Date(todo.deadline).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                                        </span>
                                    )}
                                    {isAdded ? (
                                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                    ) : (
                                        <button
                                            onClick={() => handleAddExtractedTodo(todo, idx)}
                                            className="text-[10px] font-semibold text-primary hover:text-primary/80 px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
                                        >
                                            Hinzufügen
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                {/* Hidden file input for reply attachments */}
                <input
                    type="file"
                    ref={replyFileInputRef}
                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                    multiple
                    className="hidden"
                />

                {isReplying && (
                    <div
                        className={cn("flex flex-col flex-1 min-h-0", isDragOver && "ring-2 ring-primary/50 ring-inset")}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files); }}
                    >
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

                        {/* Attachments list */}
                        {attachments.length > 0 && (
                            <div className="px-3 py-1.5 space-y-1 max-h-24 overflow-y-auto shrink-0 border-t border-border/30">
                                {attachments.map((att, idx) => (
                                    <div key={`${att.filename}-${idx}`} className="flex items-center gap-2 py-0.5 px-2 bg-muted/40 rounded group">
                                        {att.mimeType.startsWith("image/") ? (
                                            <ImageIcon className="w-3 h-3 text-primary shrink-0" />
                                        ) : att.mimeType === "application/pdf" ? (
                                            <FileText className="w-3 h-3 text-destructive shrink-0" />
                                        ) : (
                                            <FileIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                                        )}
                                        <span className="text-[11px] text-foreground truncate flex-1">{att.filename}</span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">{formatBytes(att.size)}</span>
                                        <button
                                            onClick={() => removeAttachment(idx)}
                                            className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/10 shrink-0">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => replyFileInputRef.current?.click()}
                                    className={cn(
                                        "flex items-center gap-1 rounded-sm border border-border/80 bg-background px-2 py-1.5 text-[11px] font-medium",
                                        "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shadow-sm"
                                    )}
                                    title="Datei anhängen"
                                >
                                    <Paperclip className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={() => {
                                        const input = document.createElement("input");
                                        input.type = "file";
                                        input.accept = "image/*";
                                        input.multiple = true;
                                        input.onchange = (e) => {
                                            const files = (e.target as HTMLInputElement).files;
                                            if (files) addFiles(files);
                                        };
                                        input.click();
                                    }}
                                    className={cn(
                                        "flex items-center gap-1 rounded-sm border border-border/80 bg-background px-2 py-1.5 text-[11px] font-medium",
                                        "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shadow-sm"
                                    )}
                                    title="Bild anhängen"
                                >
                                    <ImageIcon className="h-3 w-3" />
                                </button>
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
                                    {isGenerating ? "Generiere..." : "KI Entwurf"}
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-medium",
                                        "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shadow-sm"
                                    )}
                                >
                                    {copied ? <CheckCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                    {copied ? "Kopiert" : "Kopieren"}
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsReplying(false)}
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
                                    {!isSending && attachments.length > 0 && (
                                        <span className="ml-0.5 text-[9px] bg-primary-foreground/20 px-1 py-0.5 rounded-full">
                                            {attachments.length}
                                        </span>
                                    )}
                                </button>
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
                    <div className="p-3 rounded-lg border border-dashed border-border m-3 text-center">
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
            </div>
        </div>
    );
}
