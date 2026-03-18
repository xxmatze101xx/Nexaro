"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { sendEmail } from "@/lib/gmail";
import { auth } from "@/lib/firebase";
import { Paperclip, Sparkles, Send, X, Loader2, Mic } from "lucide-react";

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
    const [isGenerating, setIsGenerating] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const formatRecTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    const toggleRecording = async () => {
        if (isTranscribing) return;
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            setIsRecording(false);
            setRecordingTime(0);
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                if (blob.size < 500) return;
                setIsTranscribing(true);
                try {
                    const form = new FormData();
                    form.append("audio", blob, "recording.webm");
                    form.append("language", "de-DE");
                    const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
                    const data = (await res.json()) as { text?: string };
                    if (data.text) setBody((prev) => (prev ? prev + "\n" + data.text : data.text!));
                } finally {
                    setIsTranscribing(false);
                }
            };
            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
        } catch {
            // Mic denied
        }
    };

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

                {/* Attachments list */}
                {attachments.length > 0 && (
                    <div className="px-4 pb-1 flex flex-wrap gap-1.5 shrink-0">
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

                {/* Footer Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/10 border-t border-border shrink-0">
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
                        <div className="w-px h-4 bg-border mx-1" />
                        <button
                            onClick={() => void toggleRecording()}
                            disabled={isTranscribing}
                            className={cn(
                                "flex items-center gap-1.5 rounded-sm border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-medium transition-all shadow-sm disabled:opacity-50",
                                isRecording
                                    ? "border-red-400/60 bg-red-50 dark:bg-red-950/20 text-red-500"
                                    : isTranscribing
                                    ? "border-primary/40 bg-primary/5 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                            )}
                            title="Per Sprache diktieren"
                            type="button"
                        >
                            {isTranscribing
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Mic className={cn("w-3 h-3", isRecording && "animate-pulse")} />
                            }
                            {isTranscribing ? "Transcribing…" : isRecording ? `Stop ${formatRecTime(recordingTime)}` : "Diktieren"}
                        </button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <button
                            onClick={handleGenerateDraft}
                            disabled={isGenerating || success}
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
