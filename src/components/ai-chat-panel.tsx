"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Plus,
    Send,
    Trash2,
    MessageSquare,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    createdAt: number;
}

interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
}

// ── Storage helpers (localStorage) ────────────────────────────────────────

const STORAGE_KEY = "nexaro-ai-chats";

function loadSessions(): ChatSession[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as ChatSession[]) : [];
    } catch {
        return [];
    }
}

function saveSessions(sessions: ChatSession[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function makeId() {
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeTitleFromMessage(content: string): string {
    const trimmed = content.trim().replace(/\s+/g, " ");
    return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
}

// ── Markdown-lite renderer (no external dep) ──────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
    const lines = text.split("\n");
    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Code block
        if (line.startsWith("```")) {
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            nodes.push(
                <pre key={i} className="bg-muted/60 rounded-md p-3 text-xs font-mono overflow-x-auto my-2">
                    <code>{codeLines.join("\n")}</code>
                </pre>,
            );
            i++;
            continue;
        }

        // Heading
        if (line.startsWith("### ")) {
            nodes.push(<p key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</p>);
            i++;
            continue;
        }
        if (line.startsWith("## ")) {
            nodes.push(<p key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(3)}</p>);
            i++;
            continue;
        }
        if (line.startsWith("# ")) {
            nodes.push(<p key={i} className="font-bold text-base mt-3 mb-1">{line.slice(2)}</p>);
            i++;
            continue;
        }

        // Bullet
        if (line.startsWith("- ") || line.startsWith("* ")) {
            const items: string[] = [];
            while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
                items.push(lines[i].slice(2));
                i++;
            }
            nodes.push(
                <ul key={i} className="list-disc list-inside space-y-0.5 my-1 text-sm">
                    {items.map((item, j) => (
                        <li key={j}>{inlineFormat(item)}</li>
                    ))}
                </ul>,
            );
            continue;
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\.\s/, ""));
                i++;
            }
            nodes.push(
                <ol key={i} className="list-decimal list-inside space-y-0.5 my-1 text-sm">
                    {items.map((item, j) => (
                        <li key={j}>{inlineFormat(item)}</li>
                    ))}
                </ol>,
            );
            continue;
        }

        // Empty line
        if (line.trim() === "") {
            nodes.push(<div key={i} className="h-2" />);
            i++;
            continue;
        }

        // Normal paragraph
        nodes.push(
            <p key={i} className="text-sm leading-relaxed">
                {inlineFormat(line)}
            </p>,
        );
        i++;
    }

    return nodes;
}

function inlineFormat(text: string): React.ReactNode {
    // Bold **text** and `code`
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={i} className="bg-muted/60 rounded px-1 font-mono text-xs">{part.slice(1, -1)}</code>;
        }
        return part;
    });
}

// ── Main Component ─────────────────────────────────────────────────────────

interface AIChatPanelProps {
    className?: string;
}

export function AIChatPanel({ className }: AIChatPanelProps) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = loadSessions();
        setSessions(stored);
        if (stored.length > 0) {
            setActiveId(stored[0].id);
        }
    }, []);

    const activeSession = sessions.find(s => s.id === activeId) ?? null;

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeSession?.messages.length]);

    const updateSessions = useCallback((updated: ChatSession[]) => {
        setSessions(updated);
        saveSessions(updated);
    }, []);

    const createNewChat = useCallback(() => {
        const newSession: ChatSession = {
            id: makeId(),
            title: "New chat",
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const updated = [newSession, ...sessions];
        updateSessions(updated);
        setActiveId(newSession.id);
        setInput("");
        inputRef.current?.focus();
    }, [sessions, updateSessions]);

    const deleteSession = useCallback((id: string) => {
        const updated = sessions.filter(s => s.id !== id);
        updateSessions(updated);
        if (activeId === id) {
            setActiveId(updated.length > 0 ? updated[0].id : null);
        }
    }, [sessions, activeId, updateSessions]);

    const sendMessage = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        let sessionId = activeId;
        let currentSessions = [...sessions];

        // Auto-create a new session if none active
        if (!sessionId) {
            const newSession: ChatSession = {
                id: makeId(),
                title: makeTitleFromMessage(trimmed),
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            currentSessions = [newSession, ...currentSessions];
            sessionId = newSession.id;
            setActiveId(sessionId);
        }

        const userMsg: ChatMessage = { role: "user", content: trimmed, createdAt: Date.now() };

        const sessionIdx = currentSessions.findIndex(s => s.id === sessionId);
        if (sessionIdx === -1) return;

        const session = currentSessions[sessionIdx];
        const updatedMessages = [...session.messages, userMsg];

        // Update title from first message
        const newTitle = session.messages.length === 0
            ? makeTitleFromMessage(trimmed)
            : session.title;

        const updatedSession: ChatSession = {
            ...session,
            title: newTitle,
            messages: updatedMessages,
            updatedAt: Date.now(),
        };

        currentSessions[sessionIdx] = updatedSession;
        updateSessions(currentSessions);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
                }),
            });

            const data = (await res.json()) as { reply?: string; error?: string };

            const assistantMsg: ChatMessage = {
                role: "assistant",
                content: data.reply ?? data.error ?? "An error occurred.",
                createdAt: Date.now(),
            };

            const latestSessions = loadSessions();
            const latestIdx = latestSessions.findIndex(s => s.id === sessionId);
            if (latestIdx !== -1) {
                latestSessions[latestIdx] = {
                    ...latestSessions[latestIdx],
                    messages: [...latestSessions[latestIdx].messages, assistantMsg],
                    updatedAt: Date.now(),
                };
                updateSessions(latestSessions);
            }
        } catch {
            const latestSessions = loadSessions();
            const latestIdx = latestSessions.findIndex(s => s.id === sessionId);
            if (latestIdx !== -1) {
                latestSessions[latestIdx] = {
                    ...latestSessions[latestIdx],
                    messages: [
                        ...latestSessions[latestIdx].messages,
                        { role: "assistant", content: "Failed to connect. Please try again.", createdAt: Date.now() },
                    ],
                    updatedAt: Date.now(),
                };
                updateSessions(latestSessions);
            }
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }, [input, isLoading, activeId, sessions, updateSessions]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void sendMessage();
        }
    };

    return (
        <div className={cn("flex h-full bg-background text-foreground", className)}>

            {/* ── Session Sidebar ──────────────────────────────────────── */}
            <div className={cn(
                "border-r border-border flex flex-col transition-all duration-200 shrink-0",
                sidebarOpen ? "w-56" : "w-0 overflow-hidden",
            )}>
                {/* New chat button */}
                <div className="p-3 border-b border-border shrink-0">
                    <button
                        onClick={createNewChat}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4 shrink-0" />
                        New chat
                    </button>
                </div>

                {/* Sessions list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {sessions.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6 px-2">
                            No chats yet.
                        </p>
                    ) : (
                        sessions.map(session => (
                            <div
                                key={session.id}
                                className={cn(
                                    "group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                                    session.id === activeId
                                        ? "bg-primary/10 text-primary"
                                        : "hover:bg-muted text-muted-foreground hover:text-foreground",
                                )}
                                onClick={() => setActiveId(session.id)}
                            >
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                <span className="flex-1 text-xs truncate">{session.title}</span>
                                <button
                                    onClick={e => { e.stopPropagation(); deleteSession(session.id); }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive"
                                    aria-label="Delete chat"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Chat Area ──────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                    <button
                        onClick={() => setSidebarOpen(v => !v)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                        aria-label="Toggle sidebar"
                    >
                        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold">
                        {activeSession?.title ?? "AI Chat"}
                    </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {!activeSession || activeSession.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-16">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Nexaro AI</p>
                                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                    Your executive assistant. Ask about your inbox, draft messages, or think through decisions.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center mt-2">
                                {[
                                    "What are my top priorities today?",
                                    "Summarize my unread emails",
                                    "Help me draft a quick update",
                                ].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                                        className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeSession.messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex gap-3 max-w-[85%]",
                                        msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300",
                                    )}>
                                        {msg.role === "user" ? "U" : <Sparkles className="w-3.5 h-3.5" />}
                                    </div>

                                    {/* Bubble */}
                                    <div className={cn(
                                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                                            : "bg-muted text-foreground rounded-tl-sm",
                                    )}>
                                        {msg.role === "assistant"
                                            ? renderMarkdown(msg.content)
                                            : <p>{msg.content}</p>
                                        }
                                    </div>
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex gap-3 max-w-[85%] mr-auto">
                                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0 mt-0.5">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
                                    </div>
                                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Thinking…</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border shrink-0">
                    <div className="flex gap-2 items-end bg-muted/50 border border-border rounded-xl px-3 py-2 focus-within:border-primary/50 focus-within:bg-background transition-colors">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
                            rows={1}
                            className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground max-h-40 leading-relaxed"
                            style={{ fieldSizing: "content" } as React.CSSProperties}
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => void sendMessage()}
                            disabled={!input.trim() || isLoading}
                            className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0 self-end"
                            aria-label="Send message"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                        Nexaro AI can make mistakes. Verify important information.
                    </p>
                </div>
            </div>
        </div>
    );
}
