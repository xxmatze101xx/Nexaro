"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Hash, Lock, Loader2, Send, AlertCircle, RefreshCw } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import { cn } from "@/lib/utils";

interface SlackMsg {
    ts: string;
    user: string;
    userName: string;
    text: string;
}

interface SlackChannelViewProps {
    channelId: string;
    channelName: string;
    isPrivate: boolean;
    isDM?: boolean;
    user: FirebaseUser;
    className?: string;
}

// Deterministic avatar color from username
const AVATAR_COLORS = [
    "#e01e5a", "#ecb22e", "#2eb67d", "#36c5f0",
    "#4285f4", "#7c3aed", "#ea580c", "#0f9d58",
];
function avatarColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string): string {
    return name.split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
}

function formatTs(ts: string): string {
    const d = new Date(parseFloat(ts) * 1000);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;
    if (isYesterday) return `Gestern ${time}`;
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) + ` ${time}`;
}

// Group messages from same user within 5 minutes
function isGrouped(prev: SlackMsg | undefined, curr: SlackMsg): boolean {
    if (!prev || prev.user !== curr.user) return false;
    return parseFloat(curr.ts) - parseFloat(prev.ts) < 300;
}

// Very basic Slack mrkdwn → readable text (handles bold, italic, user/channel mentions)
function renderText(text: string): string {
    return text
        .replace(/\*([^*]+)\*/g, "$1")         // *bold* → plain (handled by weight in JSX)
        .replace(/_([^_]+)_/g, "$1")            // _italic_
        .replace(/`([^`]+)`/g, "$1")            // `code`
        .replace(/<@([A-Z0-9]+)\|([^>]+)>/g, "@$2")   // <@UID|name> → @name
        .replace(/<@([A-Z0-9]+)>/g, "@$1")             // <@UID> → @UID
        .replace(/<#([A-Z0-9]+)\|([^>]+)>/g, "#$2")   // <#CID|name> → #name
        .replace(/<([^|>]+)\|([^>]+)>/g, "$2")         // <url|text> → text
        .replace(/<(https?:[^>]+)>/g, "$1");            // <url> → url
}

export function SlackChannelView({
    channelId, channelName, isPrivate, isDM = false, user, className
}: SlackChannelViewProps) {
    const [messages, setMessages] = useState<SlackMsg[]>([]);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [input, setInput]       = useState("");
    const [sending, setSending]   = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const fetchMessages = useCallback(async () => {
        if (!channelId) return;
        setLoading(true);
        setError(null);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/slack/messages?channel=${encodeURIComponent(channelId)}`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json() as { messages?: SlackMsg[]; error?: string };
            if (data.messages) {
                setMessages(data.messages);
                // Scroll to bottom after render
                requestAnimationFrame(() =>
                    bottomRef.current?.scrollIntoView({ behavior: "instant" })
                );
            } else {
                setError(data.error ?? "Unbekannter Fehler");
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [channelId, user]);

    useEffect(() => {
        setMessages([]);
        setError(null);
        fetchMessages();
    }, [fetchMessages]);

    // Auto-poll for new messages every 15 seconds
    useEffect(() => {
        if (!channelId) return;
        const interval = setInterval(() => {
            fetchMessages();
        }, 15_000);
        return () => clearInterval(interval);
    }, [channelId, fetchMessages]);

    const handleSend = async () => {
        if (!input.trim() || sending) return;
        const text = input.trim();
        setInput("");
        setSending(true);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch("/api/slack/send", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ channel: channelId, text }),
            });
            const data = await res.json() as { ok?: boolean; error?: string };
            if (data.ok) {
                await fetchMessages();
            } else {
                console.error("Slack send error:", data.error);
            }
        } catch (e: unknown) {
            console.error("Send failed:", e);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const ChannelIcon = isDM ? null : isPrivate ? Lock : Hash;

    return (
        <div className={cn("flex flex-col h-full bg-background", className)}>

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="h-14 border-b border-border flex items-center justify-between px-5 shrink-0 bg-card">
                <div className="flex items-center gap-2">
                    {ChannelIcon && <ChannelIcon className="w-[18px] h-[18px] text-muted-foreground shrink-0" />}
                    <span className="font-bold text-foreground text-[15px] tracking-tight">
                        {channelName}
                    </span>
                </div>
                <button
                    onClick={fetchMessages}
                    disabled={loading}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    title="Nachrichten aktualisieren"
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {/* ── Message Feed ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-2 py-3">

                {loading && messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {error && !loading && (
                    <div className="flex items-start gap-2.5 mx-3 my-2 text-sm p-3 bg-destructive/10 text-destructive rounded-lg">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                            {error === "missing_scope" || error === "no_token" || error === "not_in_channel"
                                ? "Fehlende Berechtigung oder Token abgelaufen. Bitte Slack in den Einstellungen trennen und neu verbinden, um alle Kanäle lesen zu können."
                                : error === "channel_not_found"
                                ? "Kanal nicht gefunden – möglicherweise keine Zugriffsberechtigung."
                                : error === "auth_failed"
                                ? "Authentifizierung fehlgeschlagen. Bitte Seite neu laden."
                                : `Fehler: ${error}`}
                        </span>
                    </div>
                )}

                {!loading && !error && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        {ChannelIcon && <ChannelIcon className="w-8 h-8 opacity-20" />}
                        <p className="text-sm">Noch keine Nachrichten in diesem Kanal.</p>
                    </div>
                )}

                {messages.map((msg, i) => {
                    const prev = messages[i - 1];
                    const grouped = isGrouped(prev, msg);
                    const color = avatarColor(msg.userName);
                    const inits = initials(msg.userName);
                    const timeStr = new Date(parseFloat(msg.ts) * 1000)
                        .toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

                    return (
                        <div
                            key={msg.ts}
                            className={cn(
                                "group flex items-start gap-3 px-3 py-0.5 rounded-lg",
                                "hover:bg-muted/40 transition-colors cursor-default",
                                !grouped && "mt-3"
                            )}
                        >
                            {/* Avatar or time-on-hover spacer */}
                            {grouped ? (
                                <div className="w-8 shrink-0 flex items-center justify-center pt-0.5">
                                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-mono leading-none select-none">
                                        {timeStr}
                                    </span>
                                </div>
                            ) : (
                                <div
                                    className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-[11px] font-bold select-none mt-0.5"
                                    style={{ backgroundColor: color }}
                                >
                                    {inits}
                                </div>
                            )}

                            {/* Message body */}
                            <div className="flex-1 min-w-0">
                                {!grouped && (
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                        <span className="font-bold text-foreground text-sm leading-snug">
                                            {msg.userName}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            {formatTs(msg.ts)}
                                        </span>
                                    </div>
                                )}
                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                                    {renderText(msg.text)}
                                </p>
                            </div>
                        </div>
                    );
                })}

                <div ref={bottomRef} />
            </div>

            {/* ── Message Input ─────────────────────────────────────────── */}
            <div className="px-4 pb-4 pt-2 shrink-0">
                <div className="flex items-end gap-2 border border-border rounded-xl bg-muted/30 px-4 py-2 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40 transition-all">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Nachricht an ${isDM ? channelName : `#${channelName}`} schreiben…`}
                        rows={1}
                        className="flex-1 bg-transparent resize-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-1 max-h-32 overflow-y-auto leading-relaxed"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className={cn(
                            "p-1.5 rounded-md transition-all mb-0.5 shrink-0",
                            input.trim() && !sending
                                ? "bg-[#007a5a] hover:bg-[#006b4f] text-white shadow-sm"
                                : "text-muted-foreground/40 cursor-not-allowed"
                        )}
                        title="Senden (Enter)"
                    >
                        {sending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Send className="w-4 h-4" />
                        }
                    </button>
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-1 px-1 select-none">
                    Enter zum Senden · Shift+Enter für neue Zeile
                </p>
            </div>
        </div>
    );
}
