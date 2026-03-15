"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { type Message } from "@/lib/mock-data";
import { getCachedEmails, fetchRecentEmailsAndCache, fetchEmailsPage, parseGmailToNexaroMessage, clearEmailCache, markEmailStatus, archiveEmail, unarchiveEmail, starEmail, trashEmail, saveEmailsToCache, subscribeToGmailScores } from "@/lib/gmail";
import { db } from "@/lib/firebase";
import { getUserProfile, getGmailAccounts, getSlackConnection, getMicrosoftConnection } from "@/lib/user";
import type { SlackChannel } from "@/lib/slack";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";
import type { UnifiedMessage } from "@/lib/normalizers/types";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { ErrorBoundary } from "@/components/error-boundary";
import { MessageCard } from "@/components/message-card";
import { ComposePanel } from "@/components/compose-panel";
import { AIDraftPanel } from "@/components/ai-draft-panel";
import { ToastContainer } from "@/components/ui/toast";
import { NewMessageToast } from "@/components/new-message-toast";
import { InboxOverviewWidget } from "@/components/inbox-overview-widget";
import { SlackChannelView } from "@/components/slack-channel-view";
import { DailyBriefingPanel } from "@/components/daily-briefing-panel";
import { useDailyBriefing } from "@/hooks/useDailyBriefing";
import { MeetingPrepPanel } from "@/components/meeting-prep-panel";
import { useMeetingPrep } from "@/hooks/useMeetingPrep";
import { DecisionsDashboard } from "@/components/decisions-dashboard";
import { useDecisions } from "@/hooks/useDecisions";
import { AIChatPanel } from "@/components/ai-chat-panel";
import { useToast } from "@/hooks/useToast";
import {
  Inbox,
  Search,
  Bell,
  Settings,
  LayoutDashboard,
  Moon,
  Sun,
  Sparkles,
  TrendingUp,
  Mail,
  MailOpen,
  Zap,
  ChevronRight,
  Send,
  Star,
  Archive,
  FileText,
  MessageSquare,
  Hash,
  Lock,
  Calendar,
  LogOut,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const pathname = usePathname();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [gmailMessages, setGmailMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({
    slack: true,
  });

  const [gmailAccounts, setGmailAccounts] = useState<{ email: string, token: string }[]>([]);
  const [selectedSidebarItem, setSelectedSidebarItem] = useState<{ source: string, accountId?: string, folder?: string } | null>(null);

  const [slackConnected, setSlackConnected] = useState(false);
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [folderMessages, setFolderMessages] = useState<Message[]>([]);
  const [folderPageToken, setFolderPageToken] = useState<string | null>(null);
  const [inboxNextPageToken, setInboxNextPageToken] = useState<string | null>(null);
  const [isFolderLoading, setIsFolderLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDecisions, setShowDecisions] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [searchScope, setSearchScope] = useState<"global" | "folder">("global");
  // Maps Gmail external_id → importance_score from the Python pipeline in Firestore
  const [firestoreGmailScores, setFirestoreGmailScores] = useState<Record<string, number>>({});
  // Semantic search — enhances keyword filter with embedding-based ranking
  const { results: semanticResults, isSearching: isSemanticSearching, isFallback: semanticFallback } = useSemanticSearch(searchQuery);
  // Toast system
  const { toasts: actionToasts, showToast, dismissToast } = useToast();
  // New-message toasts (LIVE-02) – max 3
  const [newMsgToasts, setNewMsgToasts] = useState<{ id: string; message: Message }[]>([]);
  const prevMsgIdsRef = useRef<Set<string>>(new Set());
  // Guards to prevent false-positive toasts on load-more and initial load
  const isLoadingMoreRef = useRef(false);
  const sessionStartTimestampRef = useRef<number>(Date.now());

  // ── Sync Engine: background polling for Gmail + Slack + Teams ────────────
  const { syncedMessages, triggerSync } = useSyncEngine({
    user,
    gmailAccounts,
    slackConnected,
    slackChannels,
    microsoftConnected,
    enableEmbeddings: true,
  });

  // Fetch Slack channels via server-side proxy (logs errors in Vercel, avoids CORS/scope issues)
  const loadSlackChannels = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/slack/channels", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json() as { channels?: SlackChannel[]; error?: string; needed_scope?: string; token_type?: string };
      if (data.channels && data.channels.length > 0) {
        setSlackChannels(data.channels);
      } else {
        console.warn("[slack] channels empty or error:", data.error, data.needed_scope ?? "", data.token_type ?? "");
      }
    } catch (e: unknown) {
      console.warn("[slack] loadSlackChannels failed:", e instanceof Error ? e.message : String(e));
    }
  }, [user]);

  const toggleAccount = (id: string) => {
    setExpandedAccounts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectMessage = (message: Message) => {
    setIsComposing(false);
    setSelectedMessage(message);

    // Optimistically mark as read locally
    if (message.status === 'unread') {
      const updateStatus = (msgs: Message[]) =>
        msgs.map(m => m.id === message.id ? { ...m, status: 'read' as Message['status'] } : m);

      if (message.source === 'gmail') {
        setGmailMessages(updateStatus(gmailMessages));
        if (user && message.accountId) {
          markEmailStatus(user.uid, message.accountId, message.id, 'read').catch(err => {
            console.error("Failed to mark email as read in Gmail API", err);
          });
        }
      } else {
        setMessages(updateStatus(messages));
        // TODO: Make API call to mark as read in Firestore for non-Gmail messages
      }
    }
  };

  // Subscribe to Python pipeline scores for Gmail messages
  useEffect(() => {
    const unsub = subscribeToGmailScores(setFirestoreGmailScores);
    return () => unsub();
  }, []);

  // Subscribe to real-time messages from Firestore (only when authenticated)
  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "messages"),
      orderBy("importance_score", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => doc.data() as Message);
      setMessages(fetchedMessages);
    }, (err) => {
      console.warn("Firestore messages listener error:", err.code);
    });

    return () => unsubscribe();
  }, [user]);

  // Load user data whenever the auth user changes
  useEffect(() => {
    if (!user) return;
    getSlackConnection(user.uid).then(conn => {
      setSlackConnected(!!conn);
      if (conn) loadSlackChannels();
    });
    getMicrosoftConnection(user.uid).then(conn => setMicrosoftConnected(!!conn));
    getGmailAccounts(user.uid).then((accounts) => {
      setGmailAccounts(accounts);
      if (accounts.length > 0) {
        setExpandedAccounts(prev => {
          if (prev[`gmail_${accounts[0].email}`] === undefined) {
            return { ...prev, [`gmail_${accounts[0].email}`]: true };
          }
          return prev;
        });
      }
    });
    getUserProfile(user.uid).then((profile) => {
      if (profile) {
        if (profile.photoURL) setProfilePic(profile.photoURL);
        if (profile.displayName) setDisplayName(profile.displayName);
      } else {
        if (user.photoURL) setProfilePic(user.photoURL);
        if (user.displayName) setDisplayName(user.displayName);
      }
    });
  }, [user, loadSlackChannels]);

  // Re-check connections after OAuth redirects (e.g. ?slack_connected=true)
  // Early-exit if no relevant params — avoids Firestore reads on normal logins
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const slackOk = params.get("slack_connected") === "true";
    const msOk = params.get("microsoft_connected") === "true";
    if (!slackOk && !msOk) return;
    window.history.replaceState({}, "", "/");
    // Optimistic updates first — avoids flicker if Firestore hasn't propagated yet
    if (slackOk) setSlackConnected(true);
    if (msOk) setMicrosoftConnected(true);
    if (slackOk) getSlackConnection(user.uid).then(conn => {
      setSlackConnected(!!conn);
      if (conn) loadSlackChannels();
    });
    if (msOk) getMicrosoftConnection(user.uid).then(conn => setMicrosoftConnected(!!conn));
  }, [user]);

  // Load Gmail messages
  useEffect(() => {
    let isMounted = true;
    async function loadGmail() {
      if (!user) {
        if (isMounted) setGmailMessages([]);
        return;
      }

      if (isMounted) setIsRefreshing(true);
      try {
        const cached = await getCachedEmails();
        if (cached && cached.length > 0) {
          setGmailMessages(cached.map((msg) => parseGmailToNexaroMessage(msg)));
        }

        if (gmailAccounts.length > 0) {
          const freshResults = await Promise.all(
            gmailAccounts.map(acc => fetchEmailsPage(user.uid, acc.email, null, 20))
          );

          let newMessages: Message[] = [];
          freshResults.forEach(result => {
            if (result && result.messages.length > 0) {
              newMessages = newMessages.concat(result.messages.map(msg => parseGmailToNexaroMessage(msg)));
            }
          });

          // Capture nextPageToken from first account for inbox pagination
          const firstToken = freshResults[0]?.nextPageToken ?? null;
          if (isMounted) setInboxNextPageToken(firstToken);

          // Save to cache for offline use
          const allRaw = freshResults.flatMap(r => r?.messages ?? []);
          if (allRaw.length > 0) await saveEmailsToCache(allRaw);

          if (newMessages.length > 0 && isMounted) {
            setGmailMessages(newMessages);
          }
        }
      } catch (err) {
        console.error("Failed to load Gmail messages", err);
      } finally {
        if (isMounted) setIsRefreshing(false);
      }
    }
    loadGmail();
    return () => { isMounted = false; };
  }, [user, gmailAccounts, refreshCount]);

  // When a specific folder (SENT/STARRED/TRASH/ARCHIVE) is selected, fetch its emails
  useEffect(() => {
    const folder = selectedSidebarItem?.folder;
    // Never run Gmail folder fetch for Slack items
    if (selectedSidebarItem?.source === 'slack') {
      setFolderMessages([]);
      setFolderPageToken(null);
      return;
    }
    if (!folder || folder === 'INBOX' || !user) {
      setFolderMessages([]);
      setFolderPageToken(null);
      return;
    }

    const accountEmail = selectedSidebarItem?.accountId ?? gmailAccounts[0]?.email;
    if (!accountEmail) return;

    let isMounted = true;
    setIsFolderLoading(true);
    setFolderMessages([]);
    setFolderPageToken(null);

    fetchEmailsPage(user.uid, accountEmail, folder as 'SENT' | 'STARRED' | 'TRASH' | 'ARCHIVE', 20)
      .then(result => {
        if (!isMounted || !result) return;
        setFolderMessages(result.messages.map(m => parseGmailToNexaroMessage(m)));
        setFolderPageToken(result.nextPageToken);
      })
      .catch(err => console.error('Failed to load folder messages', err))
      .finally(() => { if (isMounted) setIsFolderLoading(false); });

    return () => { isMounted = false; };
  }, [selectedSidebarItem?.folder, selectedSidebarItem?.accountId, user, gmailAccounts]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Converts a UnifiedMessage from the sync engine into the UI's Message shape. */
  const unifiedToMessage = useCallback((u: UnifiedMessage): Message => ({
    id: u.id,
    source: u.source as Message["source"],
    external_id: u.metadata.external_id ?? u.id,
    threadId: u.threadId,
    rfcMessageId: u.metadata.rfcMessageId ?? "",
    sender: u.sender,
    senderEmail: u.metadata.senderEmail ?? "",
    subject: u.metadata.subject ?? "(Kein Betreff)",
    content: u.preview,
    htmlContent: u.metadata.htmlContent ?? null,
    timestamp: u.timestamp,
    importance_score: u.metadata.importance_score ?? 3.0,
    status: (u.metadata.status ?? "unread") as Message["status"],
    ai_draft_response: u.metadata.ai_draft_response ?? null,
    labels: u.metadata.labels ?? [],
    accountId: u.metadata.accountId ?? u.metadata.channelId ?? "",
  }), []);

  const allMessages = useMemo(() => {
    // Overlay Python pipeline scores on Gmail messages where available
    const scoredGmail = gmailMessages.map(m => {
      const pipelineScore = firestoreGmailScores[m.external_id];
      return pipelineScore !== undefined ? { ...m, importance_score: pipelineScore } : m;
    });
    // Convert background-synced messages to the UI Message shape
    const syncMessages = Array.from(syncedMessages.values()).map(unifiedToMessage);
    const combined = [...messages, ...scoredGmail, ...syncMessages];
    const uniqueMap = new Map<string, Message>();
    combined.forEach(m => uniqueMap.set(m.id, m));
    return Array.from(uniqueMap.values());
  }, [messages, gmailMessages, firestoreGmailScores, syncedMessages, unifiedToMessage]);



  const [sortOrder, setSortOrder] = useState<"date" | "importance">("date");

  // Use folder-specific messages for non-INBOX folders, otherwise allMessages
  const displayMessages = useMemo(() => {
    const folder = selectedSidebarItem?.folder;
    if (folder && folder !== 'INBOX') return folderMessages;
    return allMessages;
  }, [selectedSidebarItem, folderMessages, allMessages]);

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    // For global search, search all messages regardless of folder
    let msgs = searchQuery && searchScope === "global" ? [...allMessages] : [...displayMessages];

    // For INBOX, keep only INBOX-labeled messages when that folder is explicitly selected
    if (!searchQuery && selectedSidebarItem?.folder === 'INBOX') {
      msgs = msgs.filter(m => m.labels?.includes('INBOX'));
    }

    // Filter by source/account when no folder is active (all-messages view)
    if (!searchQuery && selectedSidebarItem && !selectedSidebarItem.folder) {
      if (selectedSidebarItem.source) msgs = msgs.filter(m => m.source === selectedSidebarItem.source);
      if (selectedSidebarItem.accountId) msgs = msgs.filter(m => m.accountId === selectedSidebarItem.accountId);
    }

    // Filter by search — semantic results take priority over keyword filter
    if (searchQuery) {
      if (semanticResults && !semanticFallback) {
        // Semantic search: rank by vector similarity score
        const scoreMap = new Map(semanticResults.map(r => [r.messageId, r.score]));
        msgs = msgs.filter(m => scoreMap.has(m.id) || scoreMap.has(m.external_id));
        msgs.sort((a, b) => {
          const sa = scoreMap.get(a.id) ?? scoreMap.get(a.external_id) ?? 0;
          const sb = scoreMap.get(b.id) ?? scoreMap.get(b.external_id) ?? 0;
          return sb - sa;
        });
      } else {
        // Keyword fallback (semantic not yet available or no embeddings stored)
        const q = searchQuery.toLowerCase();
        msgs = msgs.filter(
          (m) =>
            m.content.toLowerCase().includes(q) ||
            m.sender.toLowerCase().includes(q) ||
            (m.subject ?? "").toLowerCase().includes(q)
        );
      }
    }

    // Sort
    if (sortOrder === "importance") {
      msgs.sort((a, b) => b.importance_score - a.importance_score);
    } else {
      // Sort by date (newest first)
      msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return msgs;
  }, [displayMessages, allMessages, selectedSidebarItem, searchQuery, searchScope, sortOrder, semanticResults, semanticFallback]);

  // ── Daily Briefing ──────────────────────────────────────────────────────
  const {
    briefing: dailyBriefing,
    generatedAt: briefingGeneratedAt,
    isGenerating: isBriefingGenerating,
    error: briefingError,
    generate: generateBriefing,
  } = useDailyBriefing(user?.uid ?? null, allMessages);

  // ── Meeting Prep: upcoming meetings + AI briefings ───────────────────────
  const calendarEmails = useMemo(() => gmailAccounts.map(acc => acc.email), [gmailAccounts]);
  const { meetings: upcomingMeetings, isLoading: meetingsLoading, generateBriefing: generateMeetingBriefing } = useMeetingPrep(
    user?.uid ?? null,
    calendarEmails,
    allMessages,
  );

  // ── Decision Intelligence ────────────────────────────────────────────────
  const {
    decisions,
    isLoading: decisionsLoading,
    isExtracting: decisionsExtracting,
    error: decisionsError,
    extractDecisions,
    refresh: refreshDecisions,
  } = useDecisions(user?.uid ?? null);

  // Stats

  const stats = useMemo(() => {
    const unread = allMessages.filter((m) => m.status === "unread").length;
    const highPriority = allMessages.filter(
      (m) => m.importance_score >= 7.0
    ).length;
    const aiDrafts = allMessages.filter((m) => m.ai_draft_response).length;
    return { unread, highPriority, aiDrafts, total: allMessages.length };
  }, [allMessages]);

  // Dynamic header title based on selected folder
  const headerTitle = useMemo(() => {
    if (!selectedSidebarItem) return 'Inbox';
    switch (selectedSidebarItem.folder) {
      case 'INBOX': return 'Inbox';
      case 'SENT': return 'Gesendet';
      case 'STARRED': return 'Markiert';
      case 'ARCHIVE': return 'Archiv';
      case 'TRASH': return 'Papierkorb';
      default: break;
    }
    if (selectedSidebarItem.source === 'slack') {
      if (selectedSidebarItem.folder === 'channel') {
        const ch = slackChannels.find(c => c.id === selectedSidebarItem.accountId);
        return ch ? `#${ch.name}` : 'Slack';
      }
      return 'Direktnachrichten';
    }
    if (selectedSidebarItem.source === 'teams') return 'Teams';
    if (selectedSidebarItem.source === 'outlook') return 'Outlook';
    return 'Inbox';
  }, [selectedSidebarItem]);

  // Persist dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem("nexaro-dark-mode");
    if (saved === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("nexaro-dark-mode", String(next));
  };

  // Keyboard shortcuts: e=archive, r=reply, d=delete, u=toggle-read, ?=overlay, Esc=close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    const isEditable = (e.target as HTMLElement).hasAttribute("contenteditable");
    if (tag === "input" || tag === "textarea" || tag === "select" || isEditable) return;

    if (e.key === "?") {
      e.preventDefault();
      setShowShortcuts(prev => !prev);
      return;
    }
    if (e.key === "Escape") {
      if (showShortcuts) { setShowShortcuts(false); return; }
      if (selectedMessage) { setSelectedMessage(null); return; }
      return;
    }
    if (!selectedMessage) return;

    if (e.key === "e" || e.key === "E") {
      e.preventDefault();
      handleArchive(selectedMessage);
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("nexaro:reply"));
    } else if (e.key === "d" || e.key === "D") {
      e.preventDefault();
      handleDelete(selectedMessage);
    } else if (e.key === "u" || e.key === "U") {
      e.preventDefault();
      handleToggleRead(selectedMessage);
    } else if (e.key === "s" || e.key === "S") {
      e.preventDefault();
      handleStar(selectedMessage);
    }
  }, [selectedMessage, showShortcuts]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleArchive = async (message: Message) => {
    if (message.source !== "gmail" || !user || !message.accountId) return;
    const isArchived = Array.isArray(message.labels) && message.labels.length > 0 && !message.labels.includes('INBOX');
    try {
      if (isArchived) {
        // Unarchive: add INBOX label back
        await unarchiveEmail(user.uid, message.accountId, message.id);
        const newLabels = [...(message.labels ?? []), 'INBOX'];
        setGmailMessages(prev => prev.map(m => m.id === message.id ? { ...m, labels: newLabels } : m));
        setFolderMessages(prev => prev.filter(m => m.id !== message.id));
        showToast("In Inbox verschoben", "📥");
      } else {
        // Archive: remove from INBOX
        await archiveEmail(user.uid, message.accountId, message.id);
        setGmailMessages(prev => prev.filter(m => m.id !== message.id));
        if (selectedMessage?.id === message.id) setSelectedMessage(null);
        showToast("Archiviert", "📁");
      }
    } catch (err) {
      console.error("Failed to archive/unarchive message", err);
    }
  };

  const handleStar = async (message: Message) => {
    if (message.source !== "gmail" || !user || !message.accountId) return;
    const isStarred = message.labels?.includes('STARRED') ?? false;
    try {
      await starEmail(user.uid, message.accountId, message.id, !isStarred);
      const newLabels = isStarred
        ? (message.labels ?? []).filter(l => l !== 'STARRED')
        : [...(message.labels ?? []), 'STARRED'];
      const updateLabels = (msgs: Message[]) =>
        msgs.map(m => m.id === message.id ? { ...m, labels: newLabels } : m);
      setGmailMessages(updateLabels);
      setFolderMessages(updateLabels);
      if (selectedMessage?.id === message.id) {
        setSelectedMessage(prev => prev ? { ...prev, labels: newLabels } : prev);
      }
      showToast(isStarred ? "Stern entfernt" : "Favorit gesetzt", isStarred ? "☆" : "⭐");
    } catch (err) {
      console.error("Failed to star message", err);
    }
  };

  const handleDelete = async (message: Message) => {
    if (message.source !== "gmail" || !user || !message.accountId) return;
    // Optimistic removal — feels instant, restored on error
    const prevGmail = gmailMessages;
    const prevFolder = folderMessages;
    setGmailMessages(prev => prev.filter(m => m.id !== message.id));
    setFolderMessages(prev => prev.filter(m => m.id !== message.id));
    if (selectedMessage?.id === message.id) setSelectedMessage(null);
    try {
      await trashEmail(user.uid, message.accountId, message.id);
      showToast("Gelöscht", "🗑️");
    } catch (err) {
      // Restore on failure
      setGmailMessages(prevGmail);
      setFolderMessages(prevFolder);
      console.error("Failed to delete message", err);
    }
  };

  const handleLoadMore = async () => {
    if (!user || isFolderLoading) return;
    const folder = selectedSidebarItem?.folder;
    const accountEmail = selectedSidebarItem?.accountId ?? gmailAccounts[0]?.email;
    if (!accountEmail) return;

    isLoadingMoreRef.current = true;
    setIsFolderLoading(true);
    try {
      if (!folder || folder === 'INBOX') {
        const result = await fetchEmailsPage(user.uid, accountEmail, null, 20, inboxNextPageToken ?? undefined);
        if (result) {
          const existing = new Set(gmailMessages.map(m => m.id));
          const newMsgs = result.messages
            .map(m => parseGmailToNexaroMessage(m))
            .filter(m => !existing.has(m.id));
          setGmailMessages(prev => [...prev, ...newMsgs]);
          setInboxNextPageToken(result.nextPageToken);
        }
      } else {
        const result = await fetchEmailsPage(user.uid, accountEmail, folder as 'SENT' | 'STARRED' | 'TRASH' | 'ARCHIVE', 20, folderPageToken ?? undefined);
        if (result) {
          const existing = new Set(folderMessages.map(m => m.id));
          const newMsgs = result.messages
            .map(m => parseGmailToNexaroMessage(m))
            .filter(m => !existing.has(m.id));
          setFolderMessages(prev => [...prev, ...newMsgs]);
          setFolderPageToken(result.nextPageToken);
        }
      }
    } catch (err) {
      console.error("Failed to load more messages", err);
    } finally {
      setIsFolderLoading(false);
      isLoadingMoreRef.current = false;
    }
  };

  const handleToggleRead = async (message: Message) => {
    if (message.source !== "gmail" || !user || !message.accountId) return;
    const newStatus = message.status === "unread" ? "read" : "unread";
    try {
      await markEmailStatus(user.uid, message.accountId, message.id, newStatus);
      setGmailMessages(prev =>
        prev.map(m => m.id === message.id ? { ...m, status: newStatus } : m)
      );
      if (selectedMessage?.id === message.id) {
        setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : prev);
      }
      showToast(newStatus === "read" ? "Als gelesen markiert" : "Als ungelesen markiert", "✉️");
    } catch (err) {
      console.error("Failed to toggle read status", err);
    }
  };

  // LIVE-01: Gmail polling every 60s to keep inbox fresh without webhooks
  useEffect(() => {
    if (!user || gmailAccounts.length === 0) return;
    const interval = setInterval(() => {
      setRefreshCount(prev => prev + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, [user, gmailAccounts]);

  // LIVE-02: Detect new messages and show toast notifications
  // Only fires for messages that arrived AFTER the session started and NOT during load-more
  useEffect(() => {
    const allIds = new Set(allMessages.map(m => m.id));
    // Skip: initial load (prevMsgIdsRef is empty) OR load-more operation
    if (prevMsgIdsRef.current.size > 0 && !isLoadingMoreRef.current) {
      const newMsgs = allMessages.filter(m =>
        !prevMsgIdsRef.current.has(m.id) &&
        new Date(m.timestamp).getTime() > sessionStartTimestampRef.current
      );
      if (newMsgs.length > 0) {
        setNewMsgToasts(prev => {
          const next = [...prev, ...newMsgs.map(m => ({ id: m.id + "_toast_" + Date.now(), message: m }))];
          return next.slice(-3); // max 3 toasts (LIFO)
        });
        // Auto-dismiss after 5s
        newMsgs.forEach(m => {
          setTimeout(() => {
            setNewMsgToasts(prev => prev.filter(t => t.message.id !== m.id));
          }, 5000);
        });
      }
    }
    prevMsgIdsRef.current = allIds;
  }, [allMessages]);

  const handleRefresh = async () => {
    await clearEmailCache();
    setRefreshCount(prev => prev + 1);
    triggerSync();
  };

  const ACCOUNTS = useMemo(() => {
    const gmailEntries = gmailAccounts.map(acc => {
      const unreadCount = allMessages.filter(m => m.accountId === acc.email && m.status === 'unread').length;
      return {
        id: `gmail_${acc.email}`,
        name: `Gmail - ${acc.email}`,
        icon: <Image src="/ServiceLogos/Gmail.svg" alt="Gmail" width={16} height={16} className="shrink-0" />,
        badge: unreadCount > 0 ? unreadCount : undefined,
        items: [
          { name: 'Inbox', icon: <Inbox className="w-4 h-4" />, source: 'gmail', accountId: acc.email, folder: 'INBOX' },
          { name: 'Gesendet', icon: <Send className="w-4 h-4" />, source: 'gmail', accountId: acc.email, folder: 'SENT' },
          { name: 'Markiert', icon: <Star className="w-4 h-4" />, source: 'gmail', accountId: acc.email, folder: 'STARRED' },
          { name: 'Archiv', icon: <Archive className="w-4 h-4" />, source: 'gmail', accountId: acc.email, folder: 'ARCHIVE' },
          { name: 'Papierkorb', icon: <Trash2 className="w-4 h-4" />, source: 'gmail', accountId: acc.email, folder: 'TRASH' }
        ]
      };
    });

    const extra = [];

    if (slackConnected) {
      extra.push({
        id: 'slack',
        name: 'Slack',
        icon: <Image src="/ServiceLogos/Slack.svg" alt="Slack" width={16} height={16} className="shrink-0" />,
        badge: undefined,
        items: [
          { name: 'Direktnachrichten', icon: <MessageSquare className="w-4 h-4" />, source: 'slack', folder: 'im' },
          ...slackChannels.map(ch => ({
            name: `#${ch.name}`,
            icon: ch.is_private
              ? <Lock className="w-3.5 h-3.5" />
              : <Hash className="w-3.5 h-3.5" />,
            source: 'slack',
            accountId: ch.id,
            folder: 'channel',
          })),
        ],
      });
    }

    if (microsoftConnected) {
      extra.push({
        id: 'teams',
        name: 'Microsoft Teams',
        icon: <Image src="/ServiceLogos/Microsoft Teams.svg" alt="Teams" width={16} height={16} className="shrink-0" />,
        badge: undefined,
        items: undefined,
      });
      extra.push({
        id: 'outlook',
        name: 'Outlook',
        icon: <Image src="/ServiceLogos/Outlook.svg" alt="Outlook" width={16} height={16} className="shrink-0" />,
        badge: undefined,
        items: undefined,
      });
    }

    return [...gmailEntries, ...extra];
  }, [gmailAccounts, allMessages, slackConnected, slackChannels, microsoftConnected]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl p-6 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-bold text-foreground mb-4 tracking-tight uppercase">Keyboard Shortcuts</h2>
            <div className="space-y-3">
              {[
                { key: "e", description: "Archivieren" },
                { key: "r", description: "Antworten" },
                { key: "d", description: "Löschen" },
                { key: "u", description: "Gelesen / Ungelesen" },
                { key: "s", description: "Favorit markieren" },
                { key: "?", description: "Shortcuts anzeigen/verstecken" },
                { key: "Esc", description: "Overlay schließen / Auswahl aufheben" },
              ].map(({ key, description }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">{description}</span>
                  <kbd className="px-2 py-0.5 rounded-md border border-border bg-muted text-xs font-mono text-foreground shrink-0">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
            <button
              className="mt-5 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowShortcuts(false)}
            >
              Press Esc or ? to close
            </button>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <aside className="w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col h-full shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 shrink-0 mt-2">
          <Image src="/logo.png" alt="Nexaro Logo" width={32} height={32} className="object-contain" />
          <span className="font-bold text-lg tracking-tight text-foreground">Nexaro</span>
        </div>

        {/* User Profile */}
        <div className="px-3 mt-4 mb-4 shrink-0">
          <div className="flex items-center group cursor-pointer rounded-lg p-2 hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              {isAuthLoading ? (
                <>
                  <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0"></div>
                  <div className="flex flex-col gap-2 overflow-hidden w-full">
                    <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                    <div className="h-3 bg-muted animate-pulse rounded w-12"></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden relative">
                    {profilePic ? (
                      <Image src={profilePic} alt="Profile" fill className="object-cover" />
                    ) : (
                      displayName ? displayName.charAt(0).toUpperCase() : "M"
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-semibold text-foreground truncate">{displayName || "Dein Account"}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                      <span className="text-xs text-muted-foreground font-medium">Online</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/70 border border-transparent rounded-lg pl-9 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:bg-background focus:border-border transition-colors"
            />
          </div>
        </div>

        {/* Main Navigation */}
        <div className="px-2 mb-4 space-y-0.5 shrink-0">
          <Link href="/" className={cn("w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors", pathname === "/" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Dashboard
          </Link>
          <Link href="/calendar" className={cn("w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors", pathname === "/calendar" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Calendar className="w-4 h-4 shrink-0" />
            Kalender
          </Link>
          <Link href="/decisions" onClick={() => { setShowDecisions(false); setShowAIChat(false); }} className={cn("w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors", pathname === "/decisions" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Zap className="w-4 h-4 shrink-0" />
            Decisions
          </Link>
<Link href="/settings" className={cn("w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors", pathname === "/settings" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Settings className="w-4 h-4 shrink-0" />
            Einstellungen
          </Link>
          <button
            onClick={() => { setShowAIChat(v => !v); setShowDecisions(false); }}
            className={cn("w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors", showAIChat ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            <Bot className="w-4 h-4 shrink-0" />
            AI Chat
          </button>
        </div>

        {/* Accounts List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
          {ACCOUNTS.map(account => (
            <div key={account.id} className="mb-0.5">
              <button
                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm font-medium transition-colors"
                onClick={() => toggleAccount(account.id)}
              >
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0", expandedAccounts[account.id] && "rotate-90")} />
                  {account.icon}
                  <span className="text-foreground truncate" title={account.name}>{account.name}</span>
                </div>
                {account.badge && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center shrink-0">
                    {account.badge}
                  </span>
                )}
              </button>

              {expandedAccounts[account.id] && account.items && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {account.items.map((item: { name: string; icon: React.ReactNode; source?: string; accountId?: string; folder?: string; badge?: number }) => {
                    const isActive = selectedSidebarItem?.source === item.source &&
                      selectedSidebarItem?.accountId === item.accountId &&
                      selectedSidebarItem?.folder === item.folder;
                    return (
                      <button
                        key={item.name}
                        onClick={() => setSelectedSidebarItem({ source: item.source ?? "", accountId: item.accountId, folder: item.folder })}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-primary/20 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center shrink-0",
                            isActive ? "bg-primary/30 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          <div className="px-2 pt-2">
            <Link href="/settings?tab=integrations" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium py-2 w-full transition-colors">
              <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground flex items-center justify-center shrink-0">
                <Plus className="w-3 h-3" />
              </div>
              Account hinzufügen
            </Link>
          </div>

          {/* ── Meeting Prep Widget ─────────────────────────────────── */}
          {calendarEmails.length > 0 && (
            <div className="px-3 pt-4 pb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                Upcoming Meetings
              </p>
              <MeetingPrepPanel
                meetings={upcomingMeetings}
                isLoading={meetingsLoading}
                onGenerateBriefing={generateMeetingBriefing}
              />
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="p-4 shrink-0 mt-auto">
          <button className="flex items-center gap-2 text-sm border-t border-sidebar-border pt-4 text-muted-foreground font-medium hover:text-foreground transition-colors w-full px-2 rounded-md">
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground font-[Inter]">
              {headerTitle}
            </h1>
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
              {stats.unread} new
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground transition-colors",
                isRefreshing ? "opacity-50 cursor-not-allowed" : "hover:bg-muted hover:text-foreground"
              )}
              title="Lade Emails neu"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </button>
            <button
              onClick={() => { setIsComposing(true); setSelectedMessage(null); }}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold transition-all hover:bg-primary/90 active:scale-95 shadow-sm"
              title="Neue E-Mail schreiben"
            >
              <Pencil className="w-4 h-4" />
              Schreiben
            </button>
          </div>

          {/* Search + scope toggle (UX-V1) */}
          <div className="flex flex-col gap-1">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                  "transition-all"
                )}
              />
            </div>
            {searchQuery && (
              <div className="flex gap-1">
                <button
                  onClick={() => setSearchScope("global")}
                  className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors", searchScope === "global" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                >
                  Global
                </button>
                <button
                  onClick={() => setSearchScope("folder")}
                  className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors", searchScope === "folder" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                >
                  Nur aktueller Ordner
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <StatPill
              icon={<Mail className="h-3.5 w-3.5" />}
              value={stats.unread}
              label="Unread"
            />
            <StatPill
              icon={<TrendingUp className="h-3.5 w-3.5 text-destructive" />}
              value={stats.highPriority}
              label="High Priority"
            />
            <StatPill
              icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
              value={stats.aiDrafts}
              label="AI Drafts"
            />
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-mono text-xs border border-border"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
          </div>
        </header>

        {/* FEAT-03: Inbox Overview Widget */}
        <InboxOverviewWidget
          messages={allMessages}
          onFilter={(source) => setSelectedSidebarItem({ source })}
        />

        {/* Daily Executive Briefing */}
        {allMessages.length >= 5 && (
          <div className="px-6 pt-4 pb-0">
            <DailyBriefingPanel
              briefing={dailyBriefing}
              generatedAt={briefingGeneratedAt}
              isGenerating={isBriefingGenerating}
              error={briefingError}
              onGenerate={generateBriefing}
            />
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── AI Chat ───────────────────────────────────────────────── */}
          {showAIChat ? (
            <AIChatPanel
                className="flex-1"
                allMessages={allMessages}
                upcomingMeetings={upcomingMeetings}
                connected={{
                  gmail: gmailAccounts.length > 0,
                  slack: slackConnected,
                  calendar: gmailAccounts.length > 0,
                  teams: microsoftConnected,
                  outlook: microsoftConnected,
                }}
              />
          ) : showDecisions ? (
            <div className="flex-1 overflow-y-auto p-6">
              <DecisionsDashboard
                decisions={decisions}
                isLoading={decisionsLoading}
                isExtracting={decisionsExtracting}
                error={decisionsError}
                onExtract={() => extractDecisions(allMessages)}
                onRefresh={refreshDecisions}
              />
            </div>
          ) : selectedSidebarItem?.source === 'slack' && selectedSidebarItem.folder === 'channel' && selectedSidebarItem.accountId && user ? (
            <SlackChannelView
              key={selectedSidebarItem.accountId}
              channelId={selectedSidebarItem.accountId}
              channelName={slackChannels.find(c => c.id === selectedSidebarItem.accountId)?.name ?? "channel"}
              isPrivate={slackChannels.find(c => c.id === selectedSidebarItem.accountId)?.is_private ?? false}
              user={user}
              className="flex-1"
            />
          ) : selectedSidebarItem?.source === 'slack' && selectedSidebarItem.folder === 'im' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare className="w-10 h-10 opacity-20" />
              <p className="text-sm font-medium">Wähle einen Kanal aus der Seitenleiste.</p>
              <p className="text-xs opacity-60">Direktnachrichten-Unterstützung kommt bald.</p>
            </div>
          ) : (
          <>
          {/* ── Gmail Message List ─────────────────────────────────────── */}
          <div className="w-[480px] border-r border-border flex flex-col overflow-hidden">

            {/* List Header / Sort */}
            <div className="px-4 py-2 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nachrichten
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sortieren nach:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "date" | "importance")}
                  className="text-xs bg-transparent border-none text-foreground font-medium focus:outline-none cursor-pointer"
                >
                  <option value="date">Datum</option>
                  <option value="importance">Wichtigkeit</option>
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isFolderLoading && filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground/30 mb-3 animate-spin" />
                  <p className="text-sm text-muted-foreground">Laden...</p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MailOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No messages found
                  </p>
                </div>
              ) : (
                <>
                  {filteredMessages.map((message) => (
                    <ErrorBoundary key={message.id}>
                      <MessageCard
                        message={message}
                        isSelected={selectedMessage?.id === message.id}
                        onSelect={handleSelectMessage}
                        onArchive={handleArchive}
                        onToggleRead={handleToggleRead}
                        onStar={handleStar}
                        onDelete={handleDelete}
                      />
                    </ErrorBoundary>
                  ))}
                  {/* Load More */}
                  {(selectedSidebarItem?.folder && selectedSidebarItem.folder !== 'INBOX' ? folderPageToken : inboxNextPageToken) && (
                    <button
                      onClick={handleLoadMore}
                      disabled={isFolderLoading}
                      className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground text-center transition-colors border border-border/50 rounded-md hover:bg-muted"
                    >
                      {isFolderLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        'Mehr laden'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Detail / Compose Panel */}
          <ErrorBoundary>
          {isComposing ? (
            <ComposePanel
              uid={user?.uid || ""}
              gmailAccounts={gmailAccounts}
              onClose={() => setIsComposing(false)}
              className="flex-1"
            />
          ) : (
            <AIDraftPanel
              message={selectedMessage}
              onClose={() => setSelectedMessage(null)}
              onArchived={handleArchive}
              onStatusChanged={(msg, newStatus) => {
                setGmailMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: newStatus } : m));
                setSelectedMessage(prev => prev?.id === msg.id ? { ...prev, status: newStatus } : prev);
              }}
              onReplied={(msg) => {
                const newStatus = "replied" as const;
                setGmailMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: newStatus } : m));
                setSelectedMessage(prev => prev?.id === msg.id ? { ...prev, status: newStatus } : prev);
                showToast("Antwort gesendet", "✉️");
              }}
              className="flex-1"
            />
          )}
          </ErrorBoundary>
          </>
          )}{/* end Slack/Gmail conditional */}
        </div>
      </div>

      {/* UX-V2: Action Toast (bottom center) */}
      <ToastContainer toasts={actionToasts} onDismiss={dismissToast} />

      {/* LIVE-02: New Message Toast (bottom right) */}
      <NewMessageToast
        toasts={newMsgToasts}
        onDismiss={(id) => setNewMsgToasts(prev => prev.filter(t => t.id !== id))}
        onOpen={(message) => { handleSelectMessage(message); setNewMsgToasts(prev => prev.filter(t => t.message.id !== message.id)); }}
      />
    </div>
  );
}

// --- Helper Components ---

function NavButton({
  icon,
  active,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  active?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
        "hover:bg-muted active:scale-90",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
    </button>
  );
}

function StatPill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      {icon}
      <span className="font-medium text-foreground">{value}</span>
      <span className="hidden xl:inline">{label}</span>
    </div>
  );
}
