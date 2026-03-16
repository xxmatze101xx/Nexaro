"use client";

import { useState, useEffect, useCallback } from "react";
import ReactGridLayout, { WidthProvider } from "react-grid-layout";
import { Pencil, Check, Plus, X, LayoutGrid, Search } from "lucide-react";
import {
  loadConfig,
  saveConfig,
  WIDGET_META,
  CATEGORY_META,
  makeLayoutItem,
  type WidgetConfig,
  type WidgetId,
  type WidgetCategory,
  type StoredConfig,
  type LayoutItem,
} from "@/lib/dashboard-config";

// ── Existing widgets ──────────────────────────────────────────────
import { WidgetClock } from "@/components/dashboard/widget-clock";
import { WidgetQuote } from "@/components/dashboard/widget-quote";
import { WidgetShortcuts } from "@/components/dashboard/widget-shortcuts";
import { WidgetInboxSummary } from "@/components/dashboard/widget-inbox-summary";
import { WidgetStocks } from "@/components/dashboard/widget-stocks";
import { WidgetMeetings } from "@/components/dashboard/widget-meetings";

// ── Time & Calendar ───────────────────────────────────────────────
import { WidgetWorldClock } from "@/components/dashboard/widget-world-clock";
import { WidgetPomodoro } from "@/components/dashboard/widget-pomodoro";
import { WidgetCalendarMini } from "@/components/dashboard/widget-calendar-mini";
import { WidgetCountdown } from "@/components/dashboard/widget-countdown";
import { WidgetWeekPlanner } from "@/components/dashboard/widget-week-planner";
import { WidgetWorkingHours } from "@/components/dashboard/widget-working-hours";
import { WidgetStopwatch } from "@/components/dashboard/widget-stopwatch";

// ── Productivity ─────────────────────────────────────────────────
import { WidgetTasks } from "@/components/dashboard/widget-tasks";
import { WidgetNotes } from "@/components/dashboard/widget-notes";
import { WidgetHabitTracker } from "@/components/dashboard/widget-habit-tracker";
import { WidgetGoals } from "@/components/dashboard/widget-goals";
import { WidgetFocusMode } from "@/components/dashboard/widget-focus-mode";
import { WidgetReadingList } from "@/components/dashboard/widget-reading-list";
import { WidgetProjectStatus } from "@/components/dashboard/widget-project-status";
import { WidgetKpi } from "@/components/dashboard/widget-kpi";
import { WidgetOkr } from "@/components/dashboard/widget-okr";
import { WidgetSprint } from "@/components/dashboard/widget-sprint";
import { WidgetDecisionLog } from "@/components/dashboard/widget-decision-log";
import { WidgetMeetingPrepWidget } from "@/components/dashboard/widget-meeting-prep-widget";
import { WidgetAgendaToday } from "@/components/dashboard/widget-agenda-today";
import { WidgetWhiteboard } from "@/components/dashboard/widget-whiteboard";

// ── Communication ────────────────────────────────────────────────
import { WidgetSlackActivity } from "@/components/dashboard/widget-slack-activity";
import { WidgetEmailStats } from "@/components/dashboard/widget-email-stats";
import { WidgetTeamStatus } from "@/components/dashboard/widget-team-status";
import { WidgetResponseTime } from "@/components/dashboard/widget-response-time";
import { WidgetUnreadCount } from "@/components/dashboard/widget-unread-count";
import { WidgetMessageQueue } from "@/components/dashboard/widget-message-queue";
import { WidgetContactQuick } from "@/components/dashboard/widget-contact-quick";

// ── Finance ──────────────────────────────────────────────────────
import { WidgetCrypto } from "@/components/dashboard/widget-crypto";
import { WidgetCurrency } from "@/components/dashboard/widget-currency";
import { WidgetPortfolio } from "@/components/dashboard/widget-portfolio";
import { WidgetBudget } from "@/components/dashboard/widget-budget";
import { WidgetExpenses } from "@/components/dashboard/widget-expenses";
import { WidgetMrr } from "@/components/dashboard/widget-mrr";
import { WidgetBurnRate } from "@/components/dashboard/widget-burn-rate";
import { WidgetRevenue } from "@/components/dashboard/widget-revenue";
import { WidgetInvoices } from "@/components/dashboard/widget-invoices";

// ── Analytics ────────────────────────────────────────────────────
import { WidgetProductivityScore } from "@/components/dashboard/widget-productivity-score";
import { WidgetWeeklySummary } from "@/components/dashboard/widget-weekly-summary";
import { WidgetVisitorStats } from "@/components/dashboard/widget-visitor-stats";
import { WidgetConversion } from "@/components/dashboard/widget-conversion";
import { WidgetNps } from "@/components/dashboard/widget-nps";
import { WidgetChurn } from "@/components/dashboard/widget-churn";
import { WidgetGrowth } from "@/components/dashboard/widget-growth";
import { WidgetEmailAnalytics } from "@/components/dashboard/widget-email-analytics";

// ── Weather ──────────────────────────────────────────────────────
import { WidgetWeatherCurrent } from "@/components/dashboard/widget-weather-current";
import { WidgetWeatherForecast } from "@/components/dashboard/widget-weather-forecast";
import { WidgetAirQuality } from "@/components/dashboard/widget-air-quality";
import { WidgetUvIndex } from "@/components/dashboard/widget-uv-index";

// ── Content ──────────────────────────────────────────────────────
import { WidgetTechNews } from "@/components/dashboard/widget-tech-news";
import { WidgetBusinessNews } from "@/components/dashboard/widget-business-news";
import { WidgetWordOfDay } from "@/components/dashboard/widget-word-of-day";
import { WidgetFunFact } from "@/components/dashboard/widget-fun-fact";
import { WidgetThoughtOfDay } from "@/components/dashboard/widget-thought-of-day";
import { WidgetRssReader } from "@/components/dashboard/widget-rss-reader";
import { WidgetHackerNews } from "@/components/dashboard/widget-hacker-news";

// ── Health ───────────────────────────────────────────────────────
import { WidgetWaterTracker } from "@/components/dashboard/widget-water-tracker";
import { WidgetBreakReminder } from "@/components/dashboard/widget-break-reminder";
import { WidgetMoodTracker } from "@/components/dashboard/widget-mood-tracker";
import { WidgetMeditation } from "@/components/dashboard/widget-meditation";
import { WidgetBreathing } from "@/components/dashboard/widget-breathing";
import { WidgetAffirmations } from "@/components/dashboard/widget-affirmations";
import { WidgetGratitude } from "@/components/dashboard/widget-gratitude";
import { WidgetSleepTracker } from "@/components/dashboard/widget-sleep-tracker";

// ── Tools ────────────────────────────────────────────────────────
import { WidgetCalculator } from "@/components/dashboard/widget-calculator";
import { WidgetUnitConverter } from "@/components/dashboard/widget-unit-converter";
import { WidgetTimer } from "@/components/dashboard/widget-timer";
import { WidgetColorPicker } from "@/components/dashboard/widget-color-picker";
import { WidgetQrGenerator } from "@/components/dashboard/widget-qr-generator";
import { WidgetPasswordGen } from "@/components/dashboard/widget-password-gen";
import { WidgetTextCounter } from "@/components/dashboard/widget-text-counter";
import { WidgetJsonFormat } from "@/components/dashboard/widget-json-format";
import { WidgetBase64 } from "@/components/dashboard/widget-base64";
import { WidgetRegex } from "@/components/dashboard/widget-regex";
import { WidgetHash } from "@/components/dashboard/widget-hash";
import { WidgetIpInfo } from "@/components/dashboard/widget-ip-info";

// ── Personal ─────────────────────────────────────────────────────
import { WidgetBirthdayTracker } from "@/components/dashboard/widget-birthday-tracker";
import { WidgetJournal } from "@/components/dashboard/widget-journal";
import { WidgetBucketList } from "@/components/dashboard/widget-bucket-list";
import { WidgetSkillTracker } from "@/components/dashboard/widget-skill-tracker";
import { WidgetReadingProgress } from "@/components/dashboard/widget-reading-progress";
import { WidgetPhotoMemory } from "@/components/dashboard/widget-photo-memory";
import { WidgetTravelGoals } from "@/components/dashboard/widget-travel-goals";

// ── AI & Smart ───────────────────────────────────────────────────
import { WidgetAiInboxSummary } from "@/components/dashboard/widget-ai-inbox-summary";
import { WidgetActionItems } from "@/components/dashboard/widget-action-items";
import { WidgetInboxSentiment } from "@/components/dashboard/widget-inbox-sentiment";
import { WidgetAiMeetingInsights } from "@/components/dashboard/widget-ai-meeting-insights";
import { WidgetSmartPriority } from "@/components/dashboard/widget-smart-priority";
import { WidgetAiRecommendations } from "@/components/dashboard/widget-ai-recommendations";
import { WidgetEmailTemplates } from "@/components/dashboard/widget-email-templates";

// ── Misc ─────────────────────────────────────────────────────────
import { WidgetSystemStatus } from "@/components/dashboard/widget-system-status";
import { WidgetNewsTicker } from "@/components/dashboard/widget-news-ticker";
import { WidgetLeaderboard } from "@/components/dashboard/widget-leaderboard";
import { WidgetChangelog } from "@/components/dashboard/widget-changelog";

import type { Message } from "@/lib/mock-data";
import type { UpcomingMeeting } from "@/hooks/useMeetingPrep";
import { cn } from "@/lib/utils";

const GridLayout = WidthProvider(ReactGridLayout);

interface HomeDashboardProps {
  displayName: string;
  allMessages: Message[];
  upcomingMeetings: UpcomingMeeting[];
  meetingsLoading: boolean;
  onCompose: () => void;
  onShowAIChat: () => void;
  onOpenInbox: () => void;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name.split(" ")[0] ?? name;
  if (hour < 12) return `Guten Morgen${firstName ? `, ${firstName}` : ""}`;
  if (hour < 17) return `Guten Tag${firstName ? `, ${firstName}` : ""}`;
  return `Guten Abend${firstName ? `, ${firstName}` : ""}`;
}

export function HomeDashboard({
  displayName,
  allMessages,
  upcomingMeetings,
  meetingsLoading,
  onCompose,
  onShowAIChat,
  onOpenInbox,
}: HomeDashboardProps) {
  const [config, setConfig] = useState<StoredConfig | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all">("all");

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const enabledWidgets = config?.widgets.filter((w) => w.enabled) ?? [];
  const disabledWidgets = config?.widgets.filter((w) => !w.enabled) ?? [];
  const currentLayout = config?.layout ?? [];

  const persistConfig = useCallback((next: StoredConfig) => {
    setConfig(next);
    saveConfig(next);
  }, []);

  const handleLayoutChange = useCallback(
    (newLayout: LayoutItem[]) => {
      if (!config) return;
      const updated = newLayout.map((item) => {
        const existing = config.layout.find((l) => l.i === item.i);
        return { ...existing, ...item };
      });
      persistConfig({ ...config, layout: updated });
    },
    [config, persistConfig]
  );

  const removeWidget = (id: WidgetId) => {
    if (!config) return;
    persistConfig({
      widgets: config.widgets.map((w) => w.id === id ? { ...w, enabled: false } : w),
      layout: config.layout.filter((l) => l.i !== id),
    });
  };

  const addWidget = (id: WidgetId) => {
    if (!config) return;
    persistConfig({
      widgets: config.widgets.map((w) => w.id === id ? { ...w, enabled: true } : w),
      layout: [...config.layout, makeLayoutItem(id, config.layout)],
    });
  };

  const renderContent = (id: WidgetId): React.ReactNode => {
    switch (id) {
      // Existing
      case "clock":         return <WidgetClock />;
      case "quote":         return <WidgetQuote />;
      case "shortcuts":     return <WidgetShortcuts onCompose={onCompose} onAIChat={onShowAIChat} onInbox={onOpenInbox} />;
      case "inbox-summary": return <WidgetInboxSummary messages={allMessages} onOpenInbox={onOpenInbox} />;
      case "stocks":        return <WidgetStocks />;
      case "meetings":      return <WidgetMeetings meetings={upcomingMeetings} isLoading={meetingsLoading} />;
      // Time
      case "world-clock":   return <WidgetWorldClock />;
      case "pomodoro":      return <WidgetPomodoro />;
      case "calendar-mini": return <WidgetCalendarMini />;
      case "countdown":     return <WidgetCountdown />;
      case "week-planner":  return <WidgetWeekPlanner />;
      case "working-hours": return <WidgetWorkingHours />;
      case "stopwatch":     return <WidgetStopwatch />;
      // Productivity
      case "tasks":                 return <WidgetTasks />;
      case "notes":                 return <WidgetNotes />;
      case "habit-tracker":         return <WidgetHabitTracker />;
      case "goals":                 return <WidgetGoals />;
      case "focus-mode":            return <WidgetFocusMode />;
      case "reading-list":          return <WidgetReadingList />;
      case "project-status":        return <WidgetProjectStatus />;
      case "kpi-dashboard":         return <WidgetKpi />;
      case "okr-tracker":           return <WidgetOkr />;
      case "sprint-board":          return <WidgetSprint />;
      case "decision-log":          return <WidgetDecisionLog />;
      case "meeting-prep-widget":   return <WidgetMeetingPrepWidget />;
      case "agenda-today":          return <WidgetAgendaToday />;
      case "whiteboard":            return <WidgetWhiteboard />;
      // Communication
      case "slack-activity":        return <WidgetSlackActivity />;
      case "email-stats":           return <WidgetEmailStats />;
      case "team-status":           return <WidgetTeamStatus />;
      case "response-time-widget":  return <WidgetResponseTime />;
      case "unread-count":          return <WidgetUnreadCount />;
      case "message-queue":         return <WidgetMessageQueue />;
      case "contact-quick":         return <WidgetContactQuick />;
      // Finance
      case "crypto":      return <WidgetCrypto />;
      case "currency":    return <WidgetCurrency />;
      case "portfolio":   return <WidgetPortfolio />;
      case "budget":      return <WidgetBudget />;
      case "expenses":    return <WidgetExpenses />;
      case "mrr-widget":  return <WidgetMrr />;
      case "burn-rate":   return <WidgetBurnRate />;
      case "revenue":     return <WidgetRevenue />;
      case "invoices":    return <WidgetInvoices />;
      // Analytics
      case "productivity-score": return <WidgetProductivityScore />;
      case "weekly-summary":     return <WidgetWeeklySummary />;
      case "visitor-stats":      return <WidgetVisitorStats />;
      case "conversion-rate":    return <WidgetConversion />;
      case "nps":                return <WidgetNps />;
      case "churn-rate":         return <WidgetChurn />;
      case "growth-metrics":     return <WidgetGrowth />;
      case "email-analytics":    return <WidgetEmailAnalytics />;
      // Weather
      case "weather-current":  return <WidgetWeatherCurrent />;
      case "weather-forecast": return <WidgetWeatherForecast />;
      case "air-quality":      return <WidgetAirQuality />;
      case "uv-index":         return <WidgetUvIndex />;
      // Content
      case "tech-news":     return <WidgetTechNews />;
      case "business-news": return <WidgetBusinessNews />;
      case "word-of-day":   return <WidgetWordOfDay />;
      case "fun-fact":      return <WidgetFunFact />;
      case "thought-of-day":return <WidgetThoughtOfDay />;
      case "rss-reader":    return <WidgetRssReader />;
      case "hacker-news":   return <WidgetHackerNews />;
      // Health
      case "water-tracker":  return <WidgetWaterTracker />;
      case "break-reminder": return <WidgetBreakReminder />;
      case "mood-tracker":   return <WidgetMoodTracker />;
      case "meditation":     return <WidgetMeditation />;
      case "breathing":      return <WidgetBreathing />;
      case "affirmations":   return <WidgetAffirmations />;
      case "gratitude":      return <WidgetGratitude />;
      case "sleep-tracker":  return <WidgetSleepTracker />;
      // Tools
      case "calculator":     return <WidgetCalculator />;
      case "unit-converter": return <WidgetUnitConverter />;
      case "timer":          return <WidgetTimer />;
      case "color-picker":   return <WidgetColorPicker />;
      case "qr-generator":   return <WidgetQrGenerator />;
      case "password-gen":   return <WidgetPasswordGen />;
      case "text-counter":   return <WidgetTextCounter />;
      case "json-format":    return <WidgetJsonFormat />;
      case "base64-tool":    return <WidgetBase64 />;
      case "regex-tool":     return <WidgetRegex />;
      case "hash-gen":       return <WidgetHash />;
      case "ip-info":        return <WidgetIpInfo />;
      // Personal
      case "birthday-tracker":  return <WidgetBirthdayTracker />;
      case "journal":           return <WidgetJournal />;
      case "bucket-list":       return <WidgetBucketList />;
      case "skill-tracker":     return <WidgetSkillTracker />;
      case "reading-progress":  return <WidgetReadingProgress />;
      case "photo-memory":      return <WidgetPhotoMemory />;
      case "travel-goals":      return <WidgetTravelGoals />;
      // AI
      case "ai-inbox-summary":    return <WidgetAiInboxSummary />;
      case "action-items":        return <WidgetActionItems />;
      case "inbox-sentiment":     return <WidgetInboxSentiment />;
      case "ai-meeting-insights": return <WidgetAiMeetingInsights />;
      case "smart-priority":      return <WidgetSmartPriority />;
      case "ai-recommendations":  return <WidgetAiRecommendations />;
      case "email-templates":     return <WidgetEmailTemplates />;
      // Misc
      case "system-status": return <WidgetSystemStatus />;
      case "news-ticker":   return <WidgetNewsTicker />;
      case "leaderboard":   return <WidgetLeaderboard />;
      case "changelog":     return <WidgetChangelog />;
      default: return null;
    }
  };

  // Filtered disabled widgets for the add panel
  const filteredDisabled = disabledWidgets.filter(({ id }: WidgetConfig) => {
    const meta = WIDGET_META[id];
    const q = searchQuery.toLowerCase();
    const matchesSearch = q === "" || meta.label.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q);
    const matchesCat = selectedCategory === "all" || meta.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = Object.entries(CATEGORY_META) as [WidgetCategory, { label: string }][];

  if (!config) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border/50 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-foreground leading-none">{getGreeting(displayName)}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {new Date().toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              onClick={() => setShowAddPanel((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                showAddPanel
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Widget hinzufügen
            </button>
          )}
          <button
            onClick={() => { setEditMode((v) => !v); setShowAddPanel(false); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              editMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {editMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {editMode ? "Fertig" : "Bearbeiten"}
          </button>
        </div>
      </div>

      {/* Add Widget Panel */}
      {showAddPanel && editMode && (
        <div className="shrink-0 border-b border-border bg-muted/20 px-6 py-4 flex flex-col gap-3">
          {/* Search + Category row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0 w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Widget suchen..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors shrink-0 font-medium",
                  selectedCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                Alle ({disabledWidgets.length})
              </button>
              {categories.map(([cat, meta]) => {
                const count = disabledWidgets.filter((w) => WIDGET_META[w.id].category === cat).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? "all" : cat)}
                    className={cn(
                      "text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors shrink-0 font-medium",
                      selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {meta.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Widget grid */}
          {filteredDisabled.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {disabledWidgets.length === 0 ? "Alle Widgets sind bereits aktiv." : "Keine Widgets gefunden."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
              {filteredDisabled.map(({ id }: WidgetConfig) => {
                const meta = WIDGET_META[id];
                return (
                  <button
                    key={id}
                    onClick={() => addWidget(id)}
                    className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-left group"
                  >
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                      <Plus className="w-3 h-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground leading-tight">{meta.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {enabledWidgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 h-full text-muted-foreground">
            <LayoutGrid className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">Noch keine Widgets aktiviert.</p>
            <button
              onClick={() => { setEditMode(true); setShowAddPanel(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Widget hinzufügen
            </button>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={currentLayout}
            cols={12}
            rowHeight={80}
            margin={[12, 12]}
            isDraggable={editMode}
            isResizable={editMode}
            draggableHandle=".drag-handle"
            onLayoutChange={handleLayoutChange}
            measureBeforeMount={false}
            useCSSTransforms
          >
            {enabledWidgets.map(({ id }: WidgetConfig) => (
              <div
                key={id}
                className={cn(
                  "bg-card border border-border rounded-2xl overflow-hidden relative transition-shadow",
                  editMode && "ring-2 ring-primary/20 shadow-lg"
                )}
              >
                {editMode && (
                  <div className="drag-handle absolute inset-x-0 top-0 h-8 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing bg-gradient-to-b from-black/[0.06] to-transparent z-10 select-none rounded-t-2xl">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      ⠿ {WIDGET_META[id].label}
                    </span>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => removeWidget(id)}
                      className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className={cn("h-full p-5 overflow-hidden", editMode && "pt-10")}>
                  {renderContent(id)}
                </div>
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
