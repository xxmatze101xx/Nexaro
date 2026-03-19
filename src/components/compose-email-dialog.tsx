import React, { useState, useRef } from "react";
import { X, Send, Paperclip, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendEmail } from "@/lib/gmail";
import { auth } from "@/lib/firebase";
import { RichButton } from "@/components/ui/rich-button";

interface ComposeEmailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    uid: string;
    gmailAccounts: { email: string; token: string }[];
    defaultAccount?: string;
}

export function ComposeEmailDialog({ isOpen, onClose, uid, gmailAccounts, defaultAccount }: ComposeEmailDialogProps) {
    const [fromAccount, setFromAccount] = useState<string>(defaultAccount || (gmailAccounts[0]?.email || ""));
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleGenerateDraft = async () => {
        if (!subject.trim() && !body.trim()) {
            setError("Bitte fülle zumindest den Betreff aus, damit die KI einen Entwurf erstellen kann.");
            return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

            const res = await fetch("/api/ai/compose", {
                method: "POST",
                headers,
                body: JSON.stringify({ to, subject, hint: body }),
            });
            if (!res.ok) throw new Error("AI generation failed");
            const data = (await res.json()) as { body?: string };
            setBody(data.body ?? "");
        } catch {
            setError("KI-Entwurf konnte nicht generiert werden. Bitte versuche es erneut.");
        } finally {
            setIsGenerating(false);
        }
    };

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
            await sendEmail(uid, fromAccount, to, subject, body);
            // Reset form and close
            setTo("");
            setSubject("");
            setBody("");
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Fehler beim Senden der E-Mail.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-[600px] max-w-[90vw] bg-card border border-border rounded-md shadow-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

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
                    <div className="flex-1 pt-2 min-h-[250px] flex flex-col">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="flex-1 w-full bg-transparent resize-none focus:outline-none text-sm leading-relaxed"
                            placeholder="Schreibe deine Nachricht..."
                        />
                    </div>
                </div>

                {/* Footer / Toolbar */}
                <div className="flex flex-col border-t border-border">
                    {/* Attachments list */}
                    {attachments.length > 0 && (
                        <div className="px-4 pt-2 flex flex-wrap gap-1.5">
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
                <div className="flex items-center justify-between px-4 py-3 bg-muted/10">
                    <div className="flex items-center gap-1">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                const files = Array.from(e.target.files ?? []);
                                setAttachments(prev => [...prev, ...files]);
                                e.target.value = "";
                            }}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shadow-sm"
                            title="Datei anhängen"
                        >
                            <Paperclip className="w-3 h-3" />
                            {attachments.length > 0 ? `Anhänge (${attachments.length})` : "Anhang"}
                        </button>
                        <div className="w-px h-4 bg-border mx-1"></div>
                        <button
                            onClick={handleGenerateDraft}
                            disabled={isGenerating}
                            className={cn(
                                "flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-medium",
                                "text-primary hover:bg-primary/5 hover:border-primary/40 transition-all shadow-sm",
                                "disabled:opacity-50 disabled:pointer-events-none"
                            )}
                            title="E-Mail mit KI verfassen"
                        >
                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            {isGenerating ? "Generiere..." : "KI Entwurf"}
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Abbrechen
                        </button>
                        <RichButton
                            color="purple"
                            size="sm"
                            onClick={handleSend}
                            disabled={isSending || !to || !subject || !body || !fromAccount}
                        >
                            {isSending ? (
                                <>Senden...</>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Senden
                                </>
                            )}
                        </RichButton>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}
