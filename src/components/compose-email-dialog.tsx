import React, { useState, useRef, useCallback } from "react";
import { X, Send, Paperclip, Image as ImageIcon, Sparkles, FileText, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendEmail, fileToAttachment, MAX_ATTACHMENT_SIZE, type EmailAttachment } from "@/lib/gmail";

interface ComposeEmailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    uid: string;
    gmailAccounts: { email: string; token: string }[];
    defaultAccount?: string;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ComposeEmailDialog({ isOpen, onClose, uid, gmailAccounts, defaultAccount }: ComposeEmailDialogProps) {
    const [fromAccount, setFromAccount] = useState<string>(defaultAccount || (gmailAccounts[0]?.email || ""));
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addFiles = useCallback(async (files: FileList | File[]) => {
        setError(null);
        const fileArray = Array.from(files);
        const totalCurrentSize = attachments.reduce((s, a) => s + a.size, 0);
        const newTotalSize = totalCurrentSize + fileArray.reduce((s, f) => s + f.size, 0);
        if (newTotalSize > MAX_ATTACHMENT_SIZE) {
            setError("Gesamtgröße überschreitet 25 MB. Bitte entferne Anhänge.");
            return;
        }
        try {
            const newAttachments = await Promise.all(fileArray.map(f => fileToAttachment(f)));
            setAttachments(prev => [...prev, ...newAttachments]);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Fehler beim Lesen der Datei.");
        }
    }, [attachments]);

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!to || !subject || !body) {
            setError("Bitte fülle alle Pflichtfelder (An, Betreff, Nachricht) aus.");
            return;
        }

        if (!fromAccount) {
            setError("Kein Absender-Account ausgewählt.");
            return;
        }

        setIsSending(true);
        setError(null);

        try {
            await sendEmail(
                uid, fromAccount, to, subject, body,
                undefined, undefined, undefined, undefined, undefined,
                attachments.length > 0 ? attachments : undefined,
            );
            // Reset form and close
            setTo("");
            setSubject("");
            setBody("");
            setAttachments([]);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Fehler beim Senden der E-Mail.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div
                className={cn(
                    "w-[600px] max-w-[90vw] bg-card border border-border rounded-md shadow-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                    isDragOver && "ring-2 ring-primary/50"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files); }}
            >

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground tracking-tight">Neue Nachricht</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col p-4 space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
                    {error && (
                        <div className="p-3 mb-2 text-sm text-destructive-foreground bg-destructive/90 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* From */}
                    {gmailAccounts.length > 0 ? (
                        <div className="flex items-center border-b border-border pb-2 group">
                            <label className="text-xs font-semibold text-muted-foreground w-16 group-focus-within:text-primary transition-colors">Von:</label>
                            <select
                                value={fromAccount}
                                onChange={(e) => setFromAccount(e.target.value)}
                                className="flex-1 bg-transparent text-sm font-medium focus:outline-none appearance-none cursor-pointer"
                            >
                                {gmailAccounts.map((acc) => (
                                    <option key={acc.email} value={acc.email}>
                                        {acc.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-center border-b border-border pb-2">
                            <span className="text-xs text-destructive font-medium">Kein verbundenes Gmail-Konto gefunden.</span>
                        </div>
                    )}

                    {/* To */}
                    <div className="flex items-center border-b border-border pb-2 group">
                        <label className="text-xs font-semibold text-muted-foreground w-16 group-focus-within:text-primary transition-colors">An:</label>
                        <input
                            type="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted-foreground placeholder:font-normal"
                            placeholder="Empfänger"
                            autoFocus
                        />
                    </div>

                    {/* Subject */}
                    <div className="flex items-center border-b border-border pb-2 group">
                        <label className="text-xs font-semibold text-muted-foreground w-16 group-focus-within:text-primary transition-colors">Betreff:</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="flex-1 bg-transparent text-sm font-semibold focus:outline-none placeholder:text-muted-foreground placeholder:font-normal"
                            placeholder="Betreff"
                        />
                    </div>

                    {/* Body */}
                    <div className="flex-1 pt-2 min-h-[200px] flex flex-col">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="flex-1 w-full bg-transparent resize-none focus:outline-none text-sm leading-relaxed"
                            placeholder="Schreibe deine Nachricht..."
                        />
                    </div>

                    {/* Attachments list */}
                    {attachments.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-border/50">
                            {attachments.map((att, idx) => (
                                <div key={`${att.filename}-${idx}`} className="flex items-center gap-2 py-1 px-2 bg-muted/40 rounded-lg group">
                                    {att.mimeType.startsWith("image/") ? (
                                        <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                    ) : att.mimeType === "application/pdf" ? (
                                        <FileText className="w-3.5 h-3.5 text-destructive shrink-0" />
                                    ) : (
                                        <FileIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="text-xs text-foreground truncate flex-1">{att.filename}</span>
                                    <span className="text-[10px] text-muted-foreground shrink-0">{formatBytes(att.size)}</span>
                                    <button
                                        onClick={() => removeAttachment(idx)}
                                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                        title="Anhang entfernen"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                    multiple
                    className="hidden"
                />

                {/* Footer / Formatting Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/10 border-t border-border">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                            title="Datei anhängen"
                        >
                            <Paperclip className="w-4 h-4" />
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
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                            title="Bild anhängen"
                        >
                            <ImageIcon className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-border mx-2"></div>
                        <button className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center gap-1.5" title="Mit KI verbessern">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold tracking-wide uppercase">KI Entwurf</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Abbrechen
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isSending || !to || !subject || !body || !fromAccount}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold transition-all",
                                "hover:bg-primary/90 active:scale-95 shadow-sm",
                                (isSending || !to || !subject || !body || !fromAccount) && "opacity-50 cursor-not-allowed pointer-events-none"
                            )}
                        >
                            {isSending ? (
                                <>Senden...</>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Senden
                                    {attachments.length > 0 && (
                                        <span className="ml-1 text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">
                                            {attachments.length}
                                        </span>
                                    )}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
