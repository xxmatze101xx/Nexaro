"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { sendEmail } from "@/lib/gmail";
import { Paperclip, Image as ImageIcon, Sparkles, Send, X } from "lucide-react";

interface ComposePanelProps {
    uid: string;
    gmailAccounts: { email: string; token: string }[];
    onClose: () => void;
    className?: string;
}

export function ComposePanel({ uid, gmailAccounts, onClose, className }: ComposePanelProps) {
    const [fromAccount, setFromAccount] = useState<string>(gmailAccounts[0]?.email || "");
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

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
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Fehler beim Senden der E-Mail.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className={cn("flex flex-col h-full border-l border-border bg-card", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Send className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground tracking-tight">Neue Nachricht</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                    title="Schließen"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </button>
            </div>

            {/* Form */}
            <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex flex-col border-b border-border">
                    {/* From */}
                    {gmailAccounts.length > 0 ? (
                        <div className="flex items-center px-4 py-2.5 border-b border-border/50 group">
                            <label className="text-xs font-semibold text-muted-foreground w-16 shrink-0 group-focus-within:text-primary transition-colors">Von:</label>
                            <select
                                value={fromAccount}
                                onChange={(e) => setFromAccount(e.target.value)}
                                className="flex-1 bg-transparent text-sm font-medium focus:outline-none appearance-none cursor-pointer text-foreground"
                            >
                                {gmailAccounts.map((acc) => (
                                    <option key={acc.email} value={acc.email}>{acc.email}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-center px-4 py-2.5 border-b border-border/50">
                            <span className="text-xs text-destructive font-medium">Kein verbundenes Gmail-Konto gefunden.</span>
                        </div>
                    )}

                    {/* To */}
                    <div className="flex items-center px-4 py-2.5 border-b border-border/50 group">
                        <label className="text-xs font-semibold text-muted-foreground w-16 shrink-0 group-focus-within:text-primary transition-colors">An:</label>
                        <input
                            type="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted-foreground placeholder:font-normal text-foreground"
                            placeholder="Empfänger hinzufügen"
                            autoFocus
                        />
                    </div>

                    {/* Subject */}
                    <div className="flex items-center px-4 py-2.5 group">
                        <label className="text-xs font-semibold text-muted-foreground w-16 shrink-0 group-focus-within:text-primary transition-colors">Betreff:</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="flex-1 bg-transparent text-sm font-semibold focus:outline-none placeholder:text-muted-foreground placeholder:font-normal text-foreground"
                            placeholder="Betreff"
                        />
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-4 mt-3 p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md shrink-0">
                        {error}
                    </div>
                )}

                {/* Success */}
                {success && (
                    <div className="mx-4 mt-3 p-3 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-md shrink-0 flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        E-Mail erfolgreich gesendet!
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-hidden px-4 pt-3 pb-1">
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full h-full resize-none bg-transparent text-sm text-foreground leading-relaxed focus:outline-none placeholder:text-muted-foreground"
                        placeholder="Schreibe deine Nachricht..."
                    />
                </div>

                {/* Footer Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/10 border-t border-border shrink-0">
                    <div className="flex items-center gap-1">
                        <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Datei anhängen (Demnächst)">
                            <Paperclip className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Bild einfügen (Demnächst)">
                            <ImageIcon className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-border mx-1" />
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
                            Verwerfen
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isSending || !to || !subject || !body || !fromAccount || success}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold transition-all",
                                "hover:bg-primary/90 active:scale-95 shadow-sm",
                                (isSending || !to || !subject || !body || !fromAccount || success) && "opacity-50 cursor-not-allowed pointer-events-none"
                            )}
                        >
                            {isSending ? (
                                <>Senden...</>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Senden
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
