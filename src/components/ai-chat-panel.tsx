"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    Plus,
    Send,
    Trash2,
    MessageSquare,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ShieldCheck,
    X,
    Mail,
    Hash,
    Calendar,
    Monitor,
    Inbox,
    Paperclip,
    FileText,
    Image as ImageIcon,
    File,
    Mic,
    CornerDownLeft,
} from "lucide-react";
import { ChatInput } from "@/components/ui/chat-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/mock-data";
import type { UpcomingMeeting } from "@/hooks/useMeetingPrep";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { getCalendarAccessToken } from "@/lib/calendar";
import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    where,
} from "firebase/firestore";
import { ref, listAll, getDownloadURL, getMetadata } from "firebase/storage";

// ── Types ──────────────────────────────────────────────────────────────────

interface MentionableFile {
    filename: string;
    mimeType: string;
    url: string;
    source: string;
}

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

export interface AIChatPermissions {
    gmail: boolean;
    slack: boolean;
    calendar: boolean;
    teams: boolean;
    outlook: boolean;
}

export interface AIChatConnected {
    gmail: boolean;
    slack: boolean;
    calendar: boolean;
    teams: boolean;
    outlook: boolean;
}

// ── Permissions storage (device-specific, stay in localStorage) ────────────

const PERMISSIONS_KEY = "nexaro-ai-permissions";

const DEFAULT_PERMISSIONS: AIChatPermissions = {
    gmail: false,
    slack: false,
    calendar: false,
    teams: false,
    outlook: false,
};

function loadPermissions(): AIChatPermissions {
    if (typeof window === "undefined") return { ...DEFAULT_PERMISSIONS };
    try {
        const raw = localStorage.getItem(PERMISSIONS_KEY);
        return raw ? { ...DEFAULT_PERMISSIONS, ...(JSON.parse(raw) as Partial<AIChatPermissions>) } : { ...DEFAULT_PERMISSIONS };
    } catch {
        return { ...DEFAULT_PERMISSIONS };
    }
}

function savePermissions(p: AIChatPermissions) {
    if (typeof window === "undefined") return;
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(p));
}

// ── Firestore helpers ──────────────────────────────────────────────────────

async function loadSessionsFromFirestore(uid: string): Promise<ChatSession[]> {
    try {
        const q = query(
            collection(db, "users", uid, "chatSessions"),
            orderBy("updatedAt", "desc"),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as ChatSession);
    } catch {
        return [];
    }
}

async function saveSessionToFirestore(uid: string, session: ChatSession): Promise<void> {
    await setDoc(doc(db, "users", uid, "chatSessions", session.id), session);
}

async function deleteSessionFromFirestore(uid: string, sessionId: string): Promise<void> {
    await deleteDoc(doc(db, "users", uid, "chatSessions", sessionId));
}

async function loadMentionFiles(uid: string): Promise<MentionableFile[]> {
    const files: MentionableFile[] = [];
    const seen = new Set<string>();

    // 1. Firebase Storage uploads: users/{uid}/uploads/
    try {
        const listRef = ref(storage, `users/${uid}/uploads`);
        const result = await listAll(listRef);
        await Promise.all(result.items.map(async itemRef => {
            try {
                const [url, meta] = await Promise.all([
                    getDownloadURL(itemRef),
                    getMetadata(itemRef),
                ]);
                if (!seen.has(itemRef.name)) {
                    seen.add(itemRef.name);
                    files.push({
                        filename: itemRef.name,
                        mimeType: meta.contentType ?? "application/octet-stream",
                        url,
                        source: "upload",
                    });
                }
            } catch { /* skip unreadable item */ }
        }));
    } catch { /* storage not available or empty */ }

    // 2. Firestore email attachments from messages collection
    try {
        const q = query(collection(db, "messages"), where("userId", "==", uid));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
            const data = d.data() as {
                attachments?: Array<{ filename: string; mimeType: string; url: string }>;
                source?: string;
            };
            if (data.attachments) {
                data.attachments.forEach(att => {
                    if (!seen.has(att.filename)) {
                        seen.add(att.filename);
                        files.push({
                            filename: att.filename,
                            mimeType: att.mimeType,
                            url: att.url,
                            source: data.source ?? "email",
                        });
                    }
                });
            }
        });
    } catch { /* no messages */ }

    return files;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeId() {
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeTitleFromMessage(content: string): string {
    const trimmed = content.trim().replace(/\s+/g, " ");
    return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
}

// ── Context builder ────────────────────────────────────────────────────────

function buildContext(
    permissions: AIChatPermissions,
    allMessages: Message[],
    upcomingMeetings: UpcomingMeeting[],
): string {
    const sections: string[] = [];

    // Gmail
    if (permissions.gmail) {
        const gmailMsgs = allMessages
            .filter(m => m.source === "gmail")
            .sort((a, b) => b.importance_score - a.importance_score)
            .slice(0, 20);
        if (gmailMsgs.length > 0) {
            const lines = gmailMsgs.map(m => {
                const status = m.status === "unread" ? "UNREAD" : "read";
                const score = Math.round(m.importance_score * 10);
                const preview = m.content.slice(0, 120).replace(/\n/g, " ");
                return `- [${status}] [Score: ${score}/100] From: ${m.sender} | Subject: ${m.subject ?? "(no subject)"} | "${preview}…"`;
            });
            sections.push(`### Gmail (${gmailMsgs.length} messages, sorted by importance)\n${lines.join("\n")}`);
        }
    }

    // Slack
    if (permissions.slack) {
        const slackMsgs = allMessages
            .filter(m => m.source === "slack")
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 15);
        if (slackMsgs.length > 0) {
            const lines = slackMsgs.map(m => {
                const preview = m.content.slice(0, 100).replace(/\n/g, " ");
                const channel = m.subject ?? m.accountId ?? "unknown";
                return `- From: ${m.sender} in #${channel} | "${preview}…"`;
            });
            sections.push(`### Slack (${slackMsgs.length} recent messages)\n${lines.join("\n")}`);
        }
    }

    // Calendar
    if (permissions.calendar) {
        const meetings = upcomingMeetings.slice(0, 10);
        if (meetings.length > 0) {
            const lines = meetings.map(m => {
                const ev = m.event;
                const start = ev.start.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                const attendees = ev.attendees?.map(a => a.displayName ?? a.email).join(", ") ?? "—";
                const loc = ev.conferenceLink ? `(Video call)` : ev.location ? `(${ev.location})` : "";
                return `- ${ev.title} | ${start} ${loc} | Attendees: ${attendees}`;
            });
            sections.push(`### Upcoming Calendar Events (${meetings.length})\n${lines.join("\n")}`);
        }
    }

    // Teams
    if (permissions.teams) {
        const teamsMsgs = allMessages
            .filter(m => m.source === "teams")
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 15);
        if (teamsMsgs.length > 0) {
            const lines = teamsMsgs.map(m => {
                const preview = m.content.slice(0, 100).replace(/\n/g, " ");
                return `- From: ${m.sender} | Subject: ${m.subject ?? "—"} | "${preview}…"`;
            });
            sections.push(`### Microsoft Teams (${teamsMsgs.length} recent messages)\n${lines.join("\n")}`);
        }
    }

    // Outlook
    if (permissions.outlook) {
        const outlookMsgs = allMessages
            .filter(m => m.source === "outlook")
            .sort((a, b) => b.importance_score - a.importance_score)
            .slice(0, 15);
        if (outlookMsgs.length > 0) {
            const lines = outlookMsgs.map(m => {
                const status = m.status === "unread" ? "UNREAD" : "read";
                const preview = m.content.slice(0, 100).replace(/\n/g, " ");
                return `- [${status}] From: ${m.sender} | Subject: ${m.subject ?? "(no subject)"} | "${preview}…"`;
            });
            sections.push(`### Outlook (${outlookMsgs.length} messages)\n${lines.join("\n")}`);
        }
    }

    return sections.join("\n\n");
}

// ── Markdown-lite renderer ────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
    const lines = text.split("\n");
    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

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

        if (line.startsWith("### ")) {
            nodes.push(<p key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</p>);
            i++; continue;
        }
        if (line.startsWith("## ")) {
            nodes.push(<p key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(3)}</p>);
            i++; continue;
        }
        if (line.startsWith("# ")) {
            nodes.push(<p key={i} className="font-bold text-base mt-3 mb-1">{line.slice(2)}</p>);
            i++; continue;
        }

        if (line.startsWith("- ") || line.startsWith("* ")) {
            const items: string[] = [];
            while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
                items.push(lines[i].slice(2));
                i++;
            }
            nodes.push(
                <ul key={i} className="list-disc list-inside space-y-0.5 my-1 text-sm">
                    {items.map((item, j) => <li key={j}>{inlineFormat(item)}</li>)}
                </ul>,
            );
            continue;
        }

        if (/^\d+\.\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\.\s/, ""));
                i++;
            }
            nodes.push(
                <ol key={i} className="list-decimal list-inside space-y-0.5 my-1 text-sm">
                    {items.map((item, j) => <li key={j}>{inlineFormat(item)}</li>)}
                </ol>,
            );
            continue;
        }

        if (line.trim() === "") {
            nodes.push(<div key={i} className="h-2" />);
            i++; continue;
        }

        nodes.push(<p key={i} className="text-sm leading-relaxed">{inlineFormat(line)}</p>);
        i++;
    }

    return nodes;
}

function renderUserMessage(text: string): React.ReactNode {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) => {
        if (part.startsWith("@") && part.length > 1) {
            return (
                <span
                    key={i}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium text-xs leading-normal"
                >
                    <Paperclip className="w-2.5 h-2.5 shrink-0" />
                    {part.slice(1)}
                </span>
            );
        }
        return part;
    });
}

function inlineFormat(text: string): React.ReactNode {
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

// ── Permissions Panel ─────────────────────────────────────────────────────

interface IntegrationDef {
    key: keyof AIChatPermissions;
    label: string;
    description: string;
    icon: React.ReactNode;
}

const INTEGRATIONS: IntegrationDef[] = [
    {
        key: "gmail",
        label: "Gmail",
        description: "Top 20 emails by importance score (sender, subject, preview)",
        icon: <Mail className="w-4 h-4 text-red-500" />,
    },
    {
        key: "slack",
        label: "Slack",
        description: "15 most recent Slack messages (sender, channel, preview)",
        icon: <Hash className="w-4 h-4 text-purple-500" />,
    },
    {
        key: "calendar",
        label: "Google Calendar",
        description: "Upcoming meetings (title, time, attendees, location)",
        icon: <Calendar className="w-4 h-4 text-blue-500" />,
    },
    {
        key: "teams",
        label: "Microsoft Teams",
        description: "15 most recent Teams messages (sender, subject, preview)",
        icon: <Monitor className="w-4 h-4 text-indigo-500" />,
    },
    {
        key: "outlook",
        label: "Outlook",
        description: "15 most important Outlook emails (sender, subject, preview)",
        icon: <Inbox className="w-4 h-4 text-blue-600" />,
    },
];

interface PermissionsPanelProps {
    permissions: AIChatPermissions;
    connected: AIChatConnected;
    onChange: (key: keyof AIChatPermissions, value: boolean) => void;
    onClose: () => void;
}

function PermissionsPanel({ permissions, connected, onChange, onClose }: PermissionsPanelProps) {
    const enabledCount = Object.values(permissions).filter(Boolean).length;

    return (
        <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Data Access Permissions</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Allow the AI to read live data from your connected integrations. Data is only sent
                    when you send a message and is never stored on our servers.
                </p>

                <div className="space-y-2">
                    {INTEGRATIONS.map(integration => {
                        const isConnected = connected[integration.key];
                        const isEnabled = permissions[integration.key];

                        return (
                            <div
                                key={integration.key}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                                    !isConnected
                                        ? "border-border/50 opacity-50"
                                        : isEnabled
                                            ? "border-primary/30 bg-primary/5"
                                            : "border-border hover:border-border/80",
                                )}
                            >
                                <div className="mt-0.5 shrink-0">{integration.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium">{integration.label}</span>
                                        {!isConnected ? (
                                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                                                Not connected
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => onChange(integration.key, !isEnabled)}
                                                className={cn(
                                                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                                                    isEnabled ? "bg-primary" : "bg-muted-foreground/30",
                                                )}
                                                role="switch"
                                                aria-checked={isEnabled}
                                            >
                                                <span
                                                    className={cn(
                                                        "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                                                        isEnabled ? "translate-x-4" : "translate-x-1",
                                                    )}
                                                />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border shrink-0">
                <p className="text-[11px] text-muted-foreground text-center">
                    {enabledCount === 0
                        ? "No integrations enabled — AI has no access to your data"
                        : `${enabledCount} integration${enabledCount > 1 ? "s" : ""} enabled — data is included with each message`}
                </p>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────

interface AIChatPanelProps {
    className?: string;
    allMessages?: Message[];
    upcomingMeetings?: UpcomingMeeting[];
    connected?: Partial<AIChatConnected>;
    /** Gmail/Calendar accounts — used to obtain a live Calendar access token for tool calling */
    gmailAccounts?: { email: string; token: string }[];
}

export function AIChatPanel({ className, allMessages = [], upcomingMeetings = [], connected = {}, gmailAccounts = [] }: AIChatPanelProps) {
    const { user } = useAuth();
    const uid = user?.uid ?? null;

    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showPermissions, setShowPermissions] = useState(false);
    const [permissions, setPermissions] = useState<AIChatPermissions>({ ...DEFAULT_PERMISSIONS });
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // @ mention state
    const [mentionFiles, setMentionFiles] = useState<MentionableFile[]>([]);
    const [mentionActive, setMentionActive] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStart, setMentionStart] = useState(0);
    const [mentionIndex, setMentionIndex] = useState(0);
    // Files explicitly attached via @mention — their content will be sent to the AI
    const [attachedFiles, setAttachedFiles] = useState<MentionableFile[]>([]);

    // Keep a ref so async callbacks always see the latest sessions without stale closures
    const sessionsRef = useRef<ChatSession[]>([]);
    useEffect(() => {
        sessionsRef.current = sessions;
    }, [sessions]);

    const resolvedConnected: AIChatConnected = {
        gmail: connected.gmail ?? false,
        slack: connected.slack ?? false,
        calendar: connected.calendar ?? false,
        teams: connected.teams ?? false,
        outlook: connected.outlook ?? false,
    };

    // Load permissions from localStorage (device-specific preference)
    useEffect(() => {
        setPermissions(loadPermissions());
    }, []);

    // Load chat sessions from Firestore whenever the authenticated user changes
    useEffect(() => {
        if (!uid) return;
        void loadSessionsFromFirestore(uid).then(loaded => {
            setSessions(loaded);
            sessionsRef.current = loaded;
            if (loaded.length > 0) setActiveId(loaded[0].id);
        });
    }, [uid]);

    // Load mentionable files once per user session
    useEffect(() => {
        if (!uid) return;
        void loadMentionFiles(uid).then(setMentionFiles);
    }, [uid]);

    const activeSession = sessions.find(s => s.id === activeId) ?? null;

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeSession?.messages.length]);

    const handlePermissionChange = useCallback((key: keyof AIChatPermissions, value: boolean) => {
        setPermissions(prev => {
            const next = { ...prev, [key]: value };
            savePermissions(next);
            return next;
        });
    }, []);

    const createNewChat = useCallback(() => {
        if (!uid) return;
        const newSession: ChatSession = {
            id: makeId(),
            title: "New chat",
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        setSessions(prev => [newSession, ...prev]);
        void saveSessionToFirestore(uid, newSession);
        setActiveId(newSession.id);
        setInput("");
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [uid]);

    const deleteSession = useCallback((id: string) => {
        if (!uid) return;
        setSessions(prev => {
            const updated = prev.filter(s => s.id !== id);
            if (activeId === id) {
                setActiveId(updated.length > 0 ? updated[0].id : null);
            }
            return updated;
        });
        void deleteSessionFromFirestore(uid, id);
    }, [uid, activeId]);

    const enabledIntegrationCount = Object.values(permissions).filter(
        (v, i) => v && Object.values(resolvedConnected)[i],
    ).length;

    // Pre-compute context so it's ready instantly when the user hits send
    const precomputedContext = useMemo(
        () => buildContext(permissions, allMessages, upcomingMeetings),
        [permissions, allMessages, upcomingMeetings],
    );

    const sendMessage = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading || !uid) return;

        let sessionId = activeId;
        let currentSessions = [...sessionsRef.current];

        // Auto-create a session if none is active
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
        const newTitle = session.messages.length === 0 ? makeTitleFromMessage(trimmed) : session.title;
        const updatedSession: ChatSession = { ...session, title: newTitle, messages: updatedMessages, updatedAt: Date.now() };

        currentSessions[sessionIdx] = updatedSession;
        setSessions(currentSessions);
        sessionsRef.current = currentSessions;
        void saveSessionToFirestore(uid, updatedSession);

        setInput("");
        setIsLoading(true);

        // Fetch content of any @mentioned files and append to context
        let fileContext = "";
        if (attachedFiles.length > 0) {
            const TEXT_MIME_TYPES = ["text/", "application/json", "application/xml", "application/csv"];
            const fileSections = await Promise.all(
                attachedFiles.map(async (file) => {
                    const isText = TEXT_MIME_TYPES.some(t => file.mimeType.startsWith(t));
                    if (!isText) {
                        return `### Attached file: ${file.filename}\n(Binary file — content not available as text)`;
                    }
                    try {
                        const res = await fetch(file.url);
                        const text = await res.text();
                        const preview = text.slice(0, 8000); // cap at ~8k chars
                        return `### Attached file: ${file.filename}\n\`\`\`\n${preview}\n\`\`\``;
                    } catch {
                        return `### Attached file: ${file.filename}\n(Could not load file content)`;
                    }
                }),
            );
            fileContext = fileSections.join("\n\n");
            setAttachedFiles([]);
        }

        const context = [precomputedContext, fileContext].filter(Boolean).join("\n\n");

        // Get a live Calendar access token so the AI can call the Calendar API as a tool.
        // Only fetched when the user has enabled calendar permission and an account is connected.
        let calendarToken: string | undefined;
        let calendarEmail: string | undefined;
        if (permissions.calendar && uid && gmailAccounts.length > 0) {
            try {
                const email = gmailAccounts[0].email;
                const token = await getCalendarAccessToken(uid, email);
                if (token) {
                    calendarToken = token;
                    calendarEmail = email;
                }
            } catch {
                // Non-fatal: fall back to context-only mode without tool calling
            }
        }

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
                    context: context || undefined,
                    calendarToken,
                    calendarEmail,
                    timezone,
                }),
            });

            const data = (await res.json()) as { reply?: string; error?: string };
            const assistantMsg: ChatMessage = {
                role: "assistant",
                content: data.reply ?? data.error ?? "An error occurred.",
                createdAt: Date.now(),
            };

            // Use the ref to get the freshest state after the async call
            const latestSessions = [...sessionsRef.current];
            const latestIdx = latestSessions.findIndex(s => s.id === sessionId);
            if (latestIdx !== -1) {
                const withReply: ChatSession = {
                    ...latestSessions[latestIdx],
                    messages: [...latestSessions[latestIdx].messages, assistantMsg],
                    updatedAt: Date.now(),
                };
                latestSessions[latestIdx] = withReply;
                setSessions(latestSessions);
                sessionsRef.current = latestSessions;
                void saveSessionToFirestore(uid, withReply);
            }
        } catch {
            const latestSessions = [...sessionsRef.current];
            const latestIdx = latestSessions.findIndex(s => s.id === sessionId);
            if (latestIdx !== -1) {
                const withError: ChatSession = {
                    ...latestSessions[latestIdx],
                    messages: [...latestSessions[latestIdx].messages, {
                        role: "assistant",
                        content: "Failed to connect. Please try again.",
                        createdAt: Date.now(),
                    }],
                    updatedAt: Date.now(),
                };
                latestSessions[latestIdx] = withError;
                setSessions(latestSessions);
                sessionsRef.current = latestSessions;
                void saveSessionToFirestore(uid, withError);
            }
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }, [input, isLoading, activeId, uid, precomputedContext, attachedFiles]);

    const filteredMentions = useMemo(() =>
        mentionActive
            ? mentionFiles
                .filter(f => f.filename.toLowerCase().includes(mentionQuery.toLowerCase()))
                .slice(0, 8)
            : [],
    [mentionActive, mentionFiles, mentionQuery]);

    const insertMention = useCallback((file: MentionableFile) => {
        const before = input.slice(0, mentionStart);
        const after = input.slice(mentionStart + 1 + mentionQuery.length);
        setInput(`${before}@${file.filename}${after}`);
        setMentionActive(false);
        setMentionQuery("");
        // Track the file so its content can be sent to the AI
        setAttachedFiles(prev => prev.some(f => f.url === file.url) ? prev : [...prev, file]);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [input, mentionStart, mentionQuery]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInput(value);

        const cursor = e.target.selectionStart ?? value.length;
        const textBeforeCursor = value.slice(0, cursor);
        const atIndex = textBeforeCursor.lastIndexOf("@");

        if (atIndex !== -1) {
            const queryStr = textBeforeCursor.slice(atIndex + 1);
            if (!queryStr.includes(" ")) {
                setMentionActive(true);
                setMentionQuery(queryStr);
                setMentionStart(atIndex);
                setMentionIndex(0);
                return;
            }
        }
        setMentionActive(false);
        setMentionQuery("");
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionActive && filteredMentions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex(i => Math.min(i + 1, filteredMentions.length - 1));
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex(i => Math.max(i - 1, 0));
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(filteredMentions[mentionIndex]);
                return;
            }
            if (e.key === "Escape") {
                setMentionActive(false);
                return;
            }
        }
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void sendMessage();
        }
    };

    return (
        <div className={cn("flex h-full bg-background text-foreground relative", className)}>

            {/* ── Session Sidebar ──────────────────────────────────────── */}
            <div className={cn(
                "border-r border-border flex flex-col transition-all duration-200 shrink-0",
                sidebarOpen ? "w-56" : "w-0 overflow-hidden",
            )}>
                <div className="p-3 border-b border-border shrink-0">
                    <button
                        onClick={createNewChat}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4 shrink-0" />
                        New chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {sessions.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6 px-2">No chats yet.</p>
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
                    <span className="text-sm font-semibold flex-1 truncate">
                        {activeSession?.title ?? "AI Chat"}
                    </span>

                    {/* Data access button */}
                    <button
                        onClick={() => setShowPermissions(v => !v)}
                        className={cn(
                            "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors",
                            enabledIntegrationCount > 0
                                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                                : "border-border bg-muted/50 text-foreground hover:bg-muted",
                        )}
                        title="Manage data access"
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {enabledIntegrationCount > 0 ? `${enabledIntegrationCount} active` : "Datenzugriff"}
                    </button>
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
                            {enabledIntegrationCount === 0 && (
                                <button
                                    onClick={() => setShowPermissions(true)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mt-1"
                                >
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-xs">Datenzugriff aktivieren für persönliche Antworten</span>
                                </button>
                            )}
                            <div className="flex flex-wrap gap-2 justify-center mt-1">
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
                                    <div className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300",
                                    )}>
                                        {msg.role === "user" ? "U" : <Sparkles className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className={cn(
                                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                                            : "bg-muted text-foreground rounded-tl-sm",
                                    )}>
                                        {msg.role === "assistant" ? renderMarkdown(msg.content) : <p className="text-sm leading-relaxed">{renderUserMessage(msg.content)}</p>}
                                    </div>
                                </div>
                            ))}

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
                <div className="p-4 border-t border-border shrink-0 relative">
                    {/* @ mention dropdown — anchored to outer container so it clears the Context bar */}
                    {mentionActive && (
                        <div className="absolute bottom-full left-4 right-4 mb-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50 max-h-60 overflow-y-auto">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/50 sticky top-0 bg-popover">
                                <Paperclip className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground font-medium">
                                    Files {mentionQuery ? `— "${mentionQuery}"` : ""}
                                </span>
                            </div>
                            {filteredMentions.length > 0 ? filteredMentions.map((file, i) => (
                                <button
                                    key={file.filename}
                                    onMouseDown={e => { e.preventDefault(); insertMention(file); }}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                                        i === mentionIndex
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-muted text-foreground",
                                    )}
                                >
                                    <span className="shrink-0">
                                        {file.mimeType.startsWith("image/")
                                            ? <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                                            : file.mimeType === "application/pdf"
                                                ? <FileText className="w-3.5 h-3.5 text-red-500" />
                                                : file.mimeType.includes("word") || file.mimeType.includes("document")
                                                    ? <FileText className="w-3.5 h-3.5 text-blue-600" />
                                                    : <File className="w-3.5 h-3.5 text-muted-foreground" />}
                                    </span>
                                    <span className="flex-1 text-sm truncate">{file.filename}</span>
                                    <span className={cn(
                                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                                        file.source === "gmail" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                            : file.source === "slack" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                                            : file.source === "teams" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                            : file.source === "outlook" ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                                            : "bg-muted text-muted-foreground",
                                    )}>
                                        {file.source}
                                    </span>
                                </button>
                            )) : (
                                <p className="px-3 py-2.5 text-xs text-muted-foreground">
                                    {mentionQuery
                                        ? `Keine Dateien für "${mentionQuery}"`
                                        : "Keine Dateien gefunden"}
                                </p>
                            )}
                        </div>
                    )}
                    {enabledIntegrationCount > 0 && (
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">Context:</span>
                            {INTEGRATIONS.filter(i => permissions[i.key] && resolvedConnected[i.key]).map(i => (
                                <span key={i.key} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {i.icon && React.cloneElement(i.icon as React.ReactElement<{ className?: string }>, { className: "w-2.5 h-2.5" })}
                                    {i.label}
                                </span>
                            ))}
                        </div>
                    )}
                    <form
                        className="relative rounded-xl border border-border bg-background focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all p-1 shadow-sm"
                        onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}
                    >
                        <ChatInput
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything…"
                            disabled={isLoading}
                            className="min-h-12 max-h-40 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0 text-sm leading-relaxed"
                        />
                        <div className="flex items-center px-2 pb-2 pt-0 gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                disabled={isLoading}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                                aria-label="Attach file"
                            >
                                <Paperclip className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                disabled={isLoading}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                                aria-label="Use microphone"
                            >
                                <Mic className="size-4" />
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                className="ml-auto gap-1.5"
                                disabled={!input.trim() || isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                    <>
                                        Send
                                        <CornerDownLeft className="size-3.5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                        Nexaro AI can make mistakes. Verify important information.
                    </p>
                </div>
            </div>

            {/* ── Permissions overlay ───────────────────────────────────── */}
            {showPermissions && (
                <PermissionsPanel
                    permissions={permissions}
                    connected={resolvedConnected}
                    onChange={handlePermissionChange}
                    onClose={() => setShowPermissions(false)}
                />
            )}
        </div>
    );
}
