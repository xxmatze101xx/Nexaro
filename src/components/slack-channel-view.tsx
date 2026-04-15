"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Hash, Lock, Loader2, Send, AlertCircle, RefreshCw,
    MessageSquare, Trash2, X,
} from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import { cn } from "@/lib/utils";

interface SlackMsg {
    ts: string;
    user: string;
    userName: string;
    text: string;
    reactions?: Array<{ name: string; count: number; users: string[] }>;
    reply_count?: number;
    thread_ts?: string;
}

interface SlackChannelViewProps {
    channelId: string;
    channelName: string;
    isPrivate: boolean;
    isDM?: boolean;
    user: FirebaseUser;
    className?: string;
}

// ── Emoji helpers ─────────────────────────────────────────────────────────────
const EMOJI_MAP: Record<string, string> = {
    "+1": "👍", thumbsup: "👍", "-1": "👎", thumbsdown: "👎",
    heart: "❤️", hearts: "❤️", joy: "😂", laughing: "😄",
    tada: "🎉", party: "🎉", white_check_mark: "✅", eyes: "👀",
    rocket: "🚀", fire: "🔥", clap: "👏", raised_hands: "🙌",
    pray: "🙏", thinking_face: "🤔", sob: "😭", grinning: "😄",
    smile: "😊", wave: "👋", ok_hand: "👌", muscle: "💪",
    "100": "💯", star: "⭐", sparkles: "✨", zap: "⚡",
};
function emojiToUnicode(name: string): string {
    return EMOJI_MAP[name] ?? `:${name}:`;
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
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

// ── Timestamp formatter ───────────────────────────────────────────────────────
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

// ── Message grouping ──────────────────────────────────────────────────────────
function isGrouped(prev: SlackMsg | undefined, curr: SlackMsg): boolean {
    if (!prev || prev.user !== curr.user) return false;
    return parseFloat(curr.ts) - parseFloat(prev.ts) < 300;
}

// ── Slack mrkdwn → readable text ──────────────────────────────────────────────
function renderText(text: string): string {
    return text
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/<@([A-Z0-9]+)\|([^>]+)>/g, "@$2")
        .replace(/<@([A-Z0-9]+)>/g, "@$1")
        .replace(/<#([A-Z0-9]+)\|([^>]+)>/g, "#$2")
        .replace(/<([^|>]+)\|([^>]+)>/g, "$2")
        .replace(/<(https?:[^>]+)>/g, "$1");
}

// ── Quick-react emoji list ────────────────────────────────────────────────────
const QUICK_EMOJIS: Array<{ name: string; unicode: string }> = [
    { name: "+1",   unicode: "👍" },
    { name: "heart", unicode: "❤️" },
    { name: "joy",  unicode: "😂" },
    { name: "tada", unicode: "🎉" },
];

// ── Message row component ─────────────────────────────────────────────────────
interface MessageRowProps {
    msg: SlackMsg;
    prev: SlackMsg | undefined;
    currentSlackUserId: string | null;
    onReact: (ts: string, emoji: string, action: "add" | "remove") => void;
    onDelete: (ts: string) => void;
    onOpenThread: (ts: string) => void;
    showThreadButton: boolean;
}

function MessageRow({
    msg, prev, currentSlackUserId, onReact, onDelete, onOpenThread, showThreadButton,
}: MessageRowProps) {
    const [hovered, setHovered] = useState(false);
    const grouped = isGrouped(prev, msg);
    const color = avatarColor(msg.userName);
    const inits = initials(msg.userName);
    const timeStr = new Date(parseFloat(msg.ts) * 1000)
        .toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const isOwn = currentSlackUserId ? msg.user === currentSlackUserId : false;

    return (
        <div
            className={cn(
                "group relative flex items-start gap-3 px-3 py-0.5 rounded-lg",
                "hover:bg-muted/40 transition-colors cursor-default",
                !grouped && "mt-3"
            )}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Hover actions bar */}
            {hovered && (
                <div className="absolute top-0 right-2 -translate-y-1/2 z-10 bg-card border border-border rounded-lg shadow-sm flex items-center gap-0.5 px-1 py-0.5">
                    {QUICK_EMOJIS.map(e => {
                        const reacted = currentSlackUserId
                            ? (msg.reactions?.find(r => r.name === e.name)?.users ?? []).includes(currentSlackUserId)
                            : false;
                        return (
                            <button
                                key={e.name}
                                onClick={() => onReact(msg.ts, e.name, reacted ? "remove" : "add")}
                                className="w-7 h-7 flex items-center justify-center text-sm rounded hover:bg-muted transition-colors"
                                title={e.name}
                            >
                                {e.unicode}
                            </button>
                        );
                    })}
                    {showThreadButton && (
                        <button
                            onClick={() => onOpenThread(msg.ts)}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="In Thread antworten"
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {isOwn && (
                        <button
                            onClick={() => onDelete(msg.ts)}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Nachricht löschen"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

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

                {/* Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {msg.reactions.map(r => {
                            const reacted = currentSlackUserId ? r.users.includes(currentSlackUserId) : false;
                            return (
                                <button
                                    key={r.name}
                                    onClick={() => onReact(msg.ts, r.name, reacted ? "remove" : "add")}
                                    className={cn(
                                        "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors",
                                        reacted
                                            ? "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400"
                                            : "bg-muted/60 border-border hover:bg-muted text-foreground"
                                    )}
                                >
                                    {emojiToUnicode(r.name)} {r.count}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Reply count — only on root messages, not thread replies */}
                {(msg.reply_count ?? 0) > 0 && !msg.thread_ts && showThreadButton && (
                    <button
                        onClick={() => onOpenThread(msg.ts)}
                        className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#1264a3] hover:underline"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {msg.reply_count} {msg.reply_count === 1 ? "Antwort" : "Antworten"}
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SlackChannelView({
    channelId, channelName, isPrivate, isDM = false, user, className,
}: SlackChannelViewProps) {
    const [messages, setMessages]                 = useState<SlackMsg[]>([]);
    const [loading, setLoading]                   = useState(false);
    const [error, setError]                       = useState<string | null>(null);
    const [scopeUpgradeRequired, setScopeUpgradeRequired] = useState(false);
    const [input, setInput]                       = useState("");
    const [sending, setSending]                   = useState(false);
    const [currentSlackUserId, setCurrentSlackUserId] = useState<string | null>(null);

    // Thread state
    const [threadTs, setThreadTs]           = useState<string | null>(null);
    const [threadMessages, setThreadMessages] = useState<SlackMsg[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [threadInput, setThreadInput]     = useState("");
    const [threadSending, setThreadSending] = useState(false);

    const bottomRef       = useRef<HTMLDivElement>(null);
    const threadBottomRef = useRef<HTMLDivElement>(null);

    const fetchMessages = useCallback(async () => {
        if (!channelId) return;
        setLoading(true);
        setError(null);
        setScopeUpgradeRequired(false);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/slack/messages?channel=${encodeURIComponent(channelId)}`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json() as {
                messages?: SlackMsg[];
                error?: string;
                currentSlackUserId?: string;
            };
            if (data.error === "scope_upgrade_required") {
                setScopeUpgradeRequired(true);
            } else if (data.messages) {
                setMessages(data.messages);
                if (data.currentSlackUserId) {
                    setCurrentSlackUserId(data.currentSlackUserId);
                }
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

    const handleReauth = async () => {
        const idToken = await user.getIdToken();
        window.location.href = `/api/slack/connect?uid=${encodeURIComponent(user.uid)}&idToken=${encodeURIComponent(idToken)}`;
    };

    useEffect(() => {
        setMessages([]);
        setError(null);
        setThreadTs(null);
        setThreadMessages([]);
        fetchMessages();
    }, [fetchMessages]);

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
                if (data.error === "scope_upgrade_required") {
                    setScopeUpgradeRequired(true);
                    setInput(text);
                } else {
                    setError(data.error ?? "send_failed");
                }
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

    const handleReact = async (ts: string, emoji: string, action: "add" | "remove") => {
        const idToken = await user.getIdToken();
        await fetch("/api/slack/react", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ channel: channelId, timestamp: ts, emoji, action }),
        });
        await fetchMessages();
    };

    const handleDelete = async (ts: string) => {
        if (!confirm("Nachricht löschen?")) return;
        const idToken = await user.getIdToken();
        await fetch("/api/slack/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ channel: channelId, ts }),
        });
        setMessages(prev => prev.filter(m => m.ts !== ts));
    };

    const openThread = async (ts: string) => {
        setThreadTs(ts);
        setThreadLoading(true);
        setThreadMessages([]);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch(
                `/api/slack/thread?channel=${encodeURIComponent(channelId)}&thread_ts=${encodeURIComponent(ts)}`,
                { headers: { Authorization: `Bearer ${idToken}` } }
            );
            const data = await res.json() as {
                messages?: SlackMsg[];
                currentSlackUserId?: string;
            };
            setThreadMessages(data.messages ?? []);
            if (data.currentSlackUserId && !currentSlackUserId) {
                setCurrentSlackUserId(data.currentSlackUserId);
            }
            requestAnimationFrame(() =>
                threadBottomRef.current?.scrollIntoView({ behavior: "instant" })
            );
        } catch (e: unknown) {
            console.error("Thread fetch failed:", e);
        } finally {
            setThreadLoading(false);
        }
    };

    const handleThreadSend = async () => {
        if (!threadInput.trim() || threadSending || !threadTs) return;
        const text = threadInput.trim();
        setThreadInput("");
        setThreadSending(true);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch("/api/slack/thread", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ channel: channelId, thread_ts: threadTs, text }),
            });
            const data = await res.json() as { ok?: boolean; error?: string };
            if (data.ok) {
                await openThread(threadTs);
            } else {
                console.error("Thread send error:", data.error);
            }
        } catch (e: unknown) {
            console.error("Thread send failed:", e);
        } finally {
            setThreadSending(false);
        }
    };

    const handleThreadKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleThreadSend();
        }
    };

    const ChannelIcon = isDM ? null : isPrivate ? Lock : Hash;

    return (
        <div className={cn("flex h-full overflow-hidden bg-background", className)}>

            {/* ── Main channel panel ────────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-w-0">

                {/* Header */}
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

                {/* Message feed */}
                <div className="flex-1 overflow-y-auto px-2 py-3">

                    {loading && messages.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {scopeUpgradeRequired && !loading && (
                        <div className="flex items-start gap-2.5 mx-3 my-2 text-sm p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/20">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <div className="flex flex-col gap-1.5">
                                <span>Slack-Verbindung benötigt zusätzliche Berechtigungen.</span>
                                <button
                                    onClick={handleReauth}
                                    className="self-start text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
                                >
                                    Neu verbinden →
                                </button>
                            </div>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="flex items-start gap-2.5 mx-3 my-2 text-sm p-3 bg-destructive/10 text-destructive rounded-lg">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                                {error === "missing_scope"
                                    ? "Fehlende Berechtigung. Bitte Slack in den Einstellungen trennen und neu verbinden."
                                    : `Fehler: ${error}`}
                            </span>
                        </div>
                    )}

                    {!loading && !error && messages.length === 0 && !scopeUpgradeRequired && (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                            {ChannelIcon && <ChannelIcon className="w-8 h-8 opacity-20" />}
                            <p className="text-sm">Noch keine Nachrichten in diesem Kanal.</p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <MessageRow
                            key={msg.ts}
                            msg={msg}
                            prev={messages[i - 1]}
                            currentSlackUserId={currentSlackUserId}
                            onReact={handleReact}
                            onDelete={handleDelete}
                            onOpenThread={openThread}
                            showThreadButton={true}
                        />
                    ))}

                    <div ref={bottomRef} />
                </div>

                {/* Message input */}
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

            {/* ── Thread panel ──────────────────────────────────────────── */}
            {threadTs !== null && (
                <div className="w-[340px] border-l border-border flex flex-col bg-background shrink-0">

                    {/* Thread header */}
                    <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            <span className="font-bold text-foreground text-[14px]">Thread</span>
                        </div>
                        <button
                            onClick={() => { setThreadTs(null); setThreadMessages([]); }}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Thread schließen"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Thread messages */}
                    <div className="flex-1 overflow-y-auto px-2 py-3">
                        {threadLoading && (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {!threadLoading && threadMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                                <MessageSquare className="w-7 h-7 opacity-20" />
                                <p className="text-sm">Noch keine Antworten.</p>
                            </div>
                        )}

                        {threadMessages.map((msg, i) => (
                            <MessageRow
                                key={msg.ts}
                                msg={msg}
                                prev={threadMessages[i - 1]}
                                currentSlackUserId={currentSlackUserId}
                                onReact={async (ts, emoji, action) => {
                                    const idToken = await user.getIdToken();
                                    await fetch("/api/slack/react", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                                        body: JSON.stringify({ channel: channelId, timestamp: ts, emoji, action }),
                                    });
                                    if (threadTs) await openThread(threadTs);
                                }}
                                onDelete={async (ts) => {
                                    if (!confirm("Nachricht löschen?")) return;
                                    const idToken = await user.getIdToken();
                                    await fetch("/api/slack/delete", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                                        body: JSON.stringify({ channel: channelId, ts }),
                                    });
                                    setThreadMessages(prev => prev.filter(m => m.ts !== ts));
                                }}
                                onOpenThread={() => { /* no nested threads */ }}
                                showThreadButton={false}
                            />
                        ))}

                        <div ref={threadBottomRef} />
                    </div>

                    {/* Thread reply input */}
                    <div className="px-3 pb-3 pt-2 shrink-0">
                        <div className="flex items-end gap-2 border border-border rounded-xl bg-muted/30 px-3 py-2 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40 transition-all">
                            <textarea
                                value={threadInput}
                                onChange={e => setThreadInput(e.target.value)}
                                onKeyDown={handleThreadKeyDown}
                                placeholder="Antworten…"
                                rows={1}
                                className="flex-1 bg-transparent resize-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-1 max-h-28 overflow-y-auto leading-relaxed"
                            />
                            <button
                                onClick={handleThreadSend}
                                disabled={!threadInput.trim() || threadSending}
                                className={cn(
                                    "p-1.5 rounded-md transition-all mb-0.5 shrink-0",
                                    threadInput.trim() && !threadSending
                                        ? "bg-[#007a5a] hover:bg-[#006b4f] text-white shadow-sm"
                                        : "text-muted-foreground/40 cursor-not-allowed"
                                )}
                                title="Antworten (Enter)"
                            >
                                {threadSending
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
            )}
        </div>
    );
}
