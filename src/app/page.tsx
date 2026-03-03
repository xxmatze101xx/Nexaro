"use client";

import { useState, useMemo, useEffect } from "react";
import { type Message } from "@/lib/mock-data";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { MessageCard } from "@/components/message-card";
import { SourceFilter } from "@/components/source-filter";
import { AIDraftPanel } from "@/components/ai-draft-panel";
import {
  Inbox,
  Search,
  Bell,
  Settings,
  Moon,
  Sun,
  Sparkles,
  TrendingUp,
  Mail,
  MailOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);

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

  // Get unique sources
  const sources = useMemo(
    () => [...new Set(messages.map((m) => m.source))],
    [messages]
  );

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    let msgs = [...messages];

    // Filter by source
    if (activeSource) {
      msgs = msgs.filter((m) => m.source === activeSource);
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

    // Sort by importance (highest first)
    msgs.sort((a, b) => b.importance_score - a.importance_score);

    return msgs;
  }, [messages, activeSource, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const unread = messages.filter((m) => m.status === "unread").length;
    const highPriority = messages.filter(
      (m) => m.importance_score >= 7.0
    ).length;
    const aiDrafts = messages.filter((m) => m.ai_draft_response).length;
    return { unread, highPriority, aiDrafts, total: messages.length };
  }, [messages]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 gap-2">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-6">
          <span className="text-primary-foreground font-bold text-lg">N</span>
        </div>

        <NavButton icon={<Inbox className="h-5 w-5" />} active label="Inbox" />
        <NavButton icon={<Bell className="h-5 w-5" />} label="Notifications" />
        <NavButton icon={<Sparkles className="h-5 w-5" />} label="AI Drafts" />

        <div className="flex-1" />

        <NavButton
          icon={
            darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )
          }
          label="Toggle Theme"
          onClick={toggleDarkMode}
        />
        <NavButton icon={<Settings className="h-5 w-5" />} label="Settings" />
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
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Message List */}
          <div className="w-[480px] border-r border-border flex flex-col overflow-hidden">
            {/* Source Filter */}
            <div className="p-4 border-b border-border">
              <SourceFilter
                sources={sources}
                activeSource={activeSource}
                onSourceChange={setActiveSource}
              />
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
                    onSelect={setSelectedMessage}
                  />
                ))
              )}
            </div>
          </div>

          {/* AI Draft Panel */}
          <AIDraftPanel
            message={selectedMessage}
            onClose={() => setSelectedMessage(null)}
            className="flex-1"
          />
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
