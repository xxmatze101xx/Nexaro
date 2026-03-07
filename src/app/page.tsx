"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { type Message } from "@/lib/mock-data";
import { getCachedEmails, fetchRecentEmailsAndCache, parseGmailToNexaroMessage, clearEmailCache, markEmailStatus, archiveEmail, subscribeToGmailScores } from "@/lib/gmail";
import { db } from "@/lib/firebase";
import { getUserProfile, getGmailAccounts, getSlackConnection, getMicrosoftConnection } from "@/lib/user";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { MessageCard } from "@/components/message-card";
import { ComposePanel } from "@/components/compose-panel";

import { AIDraftPanel } from "@/components/ai-draft-panel";
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
  Users,
  Calendar,
  LogOut,
  Plus,
  Contact,
  RefreshCw,
  Pencil
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
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Maps Gmail external_id → importance_score from the Python pipeline in Firestore
  const [firestoreGmailScores, setFirestoreGmailScores] = useState<Record<string, number>>({});

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

  // Subscribe to real-time messages from Firestore
  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      // Optionally filter by user_id here when auth is fully implemented
      orderBy("importance_score", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => doc.data() as Message);
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, []);

  // Load user data whenever the auth user changes
  useEffect(() => {
    if (!user) return;
    getSlackConnection(user.uid).then(conn => setSlackConnected(!!conn));
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
          const freshPromises = gmailAccounts.map(acc => fetchRecentEmailsAndCache(user.uid, acc.email, 20));
          const freshResultsArray = await Promise.all(freshPromises);

          let newMessages: Message[] = [];
          freshResultsArray.forEach(freshArray => {
            if (freshArray && freshArray.length > 0) {
              newMessages = newMessages.concat(freshArray.map(msg => parseGmailToNexaroMessage(msg)));
            }
          });

          if (newMessages.length > 0) {
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

  const allMessages = useMemo(() => {
    // Overlay Python pipeline scores on Gmail messages where available
    const scoredGmail = gmailMessages.map(m => {
      const pipelineScore = firestoreGmailScores[m.external_id];
      return pipelineScore !== undefined ? { ...m, importance_score: pipelineScore } : m;
    });
    const combined = [...messages, ...scoredGmail];
    const uniqueMap = new Map<string, Message>();
    combined.forEach(m => uniqueMap.set(m.id, m));
    return Array.from(uniqueMap.values());
  }, [messages, gmailMessages, firestoreGmailScores]);



  const [sortOrder, setSortOrder] = useState<"date" | "importance">("date");

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    let msgs = [...allMessages];

    // Filter by sidebar selection
    if (selectedSidebarItem) {
      if (selectedSidebarItem.source) msgs = msgs.filter(m => m.source === selectedSidebarItem.source);
      if (selectedSidebarItem.accountId) msgs = msgs.filter(m => m.accountId === selectedSidebarItem.accountId);
      if (selectedSidebarItem.folder) {
        if (selectedSidebarItem.folder === 'INBOX') msgs = msgs.filter(m => m.labels?.includes('INBOX'));
        else if (selectedSidebarItem.folder === 'SENT') msgs = msgs.filter(m => m.labels?.includes('SENT'));
        else if (selectedSidebarItem.folder === 'STARRED') msgs = msgs.filter(m => m.labels?.includes('STARRED'));
        else if (selectedSidebarItem.folder === 'ARCHIVE') msgs = msgs.filter(m => !m.labels?.includes('INBOX') && !m.labels?.includes('TRASH'));
      }
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      msgs = msgs.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.sender.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortOrder === "importance") {
      msgs.sort((a, b) => b.importance_score - a.importance_score);
    } else {
      // Sort by date (newest first)
      msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return msgs;
  }, [allMessages, selectedSidebarItem, searchQuery, sortOrder]);

  // Stats

  const stats = useMemo(() => {
    const unread = allMessages.filter((m) => m.status === "unread").length;
    const highPriority = allMessages.filter(
      (m) => m.importance_score >= 7.0
    ).length;
    const aiDrafts = allMessages.filter((m) => m.ai_draft_response).length;
    return { unread, highPriority, aiDrafts, total: allMessages.length };
  }, [allMessages]);

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

  // Keyboard shortcuts: e = archive, r = reply, ? = shortcuts overlay
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;

    if (e.key === "?") {
      e.preventDefault();
      setShowShortcuts(prev => !prev);
      return;
    }
    if (e.key === "Escape") {
      setShowShortcuts(false);
      return;
    }
    if (!selectedMessage) return;

    if (e.key === "e" || e.key === "E") {
      e.preventDefault();
      handleArchive(selectedMessage);
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      // Trigger reply by selecting the message (AIDraftPanel will open reply mode)
      // Since AIDraftPanel is already open, we dispatch a custom event
      document.dispatchEvent(new CustomEvent("nexaro:reply"));
    }
  }, [selectedMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleArchive = async (message: Message) => {
    if (message.source !== "gmail" || !user || !message.accountId) return;
    try {
      await archiveEmail(user.uid, message.accountId, message.id);
      setGmailMessages(prev => prev.filter(m => m.id !== message.id));
      if (selectedMessage?.id === message.id) setSelectedMessage(null);
    } catch (err) {
      console.error("Failed to archive message", err);
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
    } catch (err) {
      console.error("Failed to toggle read status", err);
    }
  };

  const handleRefresh = async () => {
    await clearEmailCache();
    setRefreshCount(prev => prev + 1);
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
          { name: 'Archiv', icon: <Archive className="w-4 h-4" />, source: 'gmail', accountId: acc.email, folder: 'ARCHIVE' }
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
          { name: 'Direktnachrichten', icon: <MessageSquare className="w-4 h-4" /> },
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
  }, [gmailAccounts, allMessages, slackConnected, microsoftConnected]);

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
                { key: "e", description: "Archive selected message" },
                { key: "r", description: "Reply to selected message" },
                { key: "?", description: "Show / hide shortcuts" },
                { key: "Esc", description: "Close overlay / deselect" },
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
          <Link href="/contacts" className={cn("w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors", pathname === "/contacts" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Users className="w-4 h-4 shrink-0" />
            Kontakte
          </Link>
          <Link href="/settings" className={cn("w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors", pathname === "/settings" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Settings className="w-4 h-4 shrink-0" />
            Einstellungen
          </Link>
        </div>

        {/* Accounts List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
          {ACCOUNTS.map(account => (
            <div key={account.id} className="mb-0.5">
              <button
                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm font-medium transition-colors"
                onClick={() => toggleAccount(account.id)}
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0", expandedAccounts[account.id] && "rotate-90")} />
                  {account.icon}
                  <span className="text-foreground truncate">{account.name}</span>
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
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium py-2 w-full transition-colors">
              <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground flex items-center justify-center shrink-0">
                <Plus className="w-3 h-3" />
              </div>
              Account hinzufügen
            </button>
          </div>
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
              Inbox
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

          {/* Search */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                "transition-all"
              )}
            />
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

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Message List */}
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
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MailOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No messages found
                  </p>
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    isSelected={selectedMessage?.id === message.id}
                    onSelect={handleSelectMessage}
                    onArchive={handleArchive}
                    onToggleRead={handleToggleRead}
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail / Compose Panel */}
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
              className="flex-1"
            />
          )}
        </div>
      </div>


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
