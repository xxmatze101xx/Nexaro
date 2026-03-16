"use client";

import { useState, useEffect, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { Pencil, Check, Plus, X, LayoutGrid } from "lucide-react";
import {
  loadConfig,
  saveConfig,
  WIDGET_META,
  makeLayoutItem,
  type WidgetConfig,
  type WidgetId,
  type StoredConfig,
  type LayoutItem,
} from "@/lib/dashboard-config";
import { WidgetClock } from "@/components/dashboard/widget-clock";
import { WidgetQuote } from "@/components/dashboard/widget-quote";
import { WidgetShortcuts } from "@/components/dashboard/widget-shortcuts";
import { WidgetInboxSummary } from "@/components/dashboard/widget-inbox-summary";
import { WidgetStocks } from "@/components/dashboard/widget-stocks";
import { WidgetMeetings } from "@/components/dashboard/widget-meetings";
import type { Message } from "@/lib/mock-data";
import type { UpcomingMeeting } from "@/hooks/useMeetingPrep";
import { cn } from "@/lib/utils";

const ResponsiveGridLayout = WidthProvider(Responsive);

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
      // Merge positions back — keep minW/minH from current layout
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
      widgets: config.widgets.map((w) =>
        w.id === id ? { ...w, enabled: false } : w
      ),
      layout: config.layout.filter((l) => l.i !== id),
    });
  };

  const addWidget = (id: WidgetId) => {
    if (!config) return;
    persistConfig({
      widgets: config.widgets.map((w) =>
        w.id === id ? { ...w, enabled: true } : w
      ),
      layout: [...config.layout, makeLayoutItem(id, config.layout)],
    });
  };

  const renderContent = (id: WidgetId) => {
    switch (id) {
      case "clock":
        return <WidgetClock />;
      case "quote":
        return <WidgetQuote />;
      case "shortcuts":
        return (
          <WidgetShortcuts
            onCompose={onCompose}
            onAIChat={onShowAIChat}
            onInbox={onOpenInbox}
          />
        );
      case "inbox-summary":
        return (
          <WidgetInboxSummary
            messages={allMessages}
            onOpenInbox={onOpenInbox}
          />
        );
      case "stocks":
        return <WidgetStocks />;
      case "meetings":
        return (
          <WidgetMeetings
            meetings={upcomingMeetings}
            isLoading={meetingsLoading}
          />
        );
      default:
        return null;
    }
  };

  if (!config) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border/50 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-foreground leading-none">
            {getGreeting(displayName)}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
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
            onClick={() => {
              setEditMode((v) => !v);
              setShowAddPanel(false);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              editMode
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {editMode ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Pencil className="w-3.5 h-3.5" />
            )}
            {editMode ? "Fertig" : "Bearbeiten"}
          </button>
        </div>
      </div>

      {/* Add Widget Panel */}
      {showAddPanel && editMode && (
        <div className="shrink-0 border-b border-border bg-muted/30 px-8 py-4">
          {disabledWidgets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Alle Widgets sind bereits aktiv.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {disabledWidgets.map(({ id }: WidgetConfig) => {
                const meta = WIDGET_META[id];
                return (
                  <button
                    key={id}
                    onClick={() => addWidget(id)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Plus className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-none">
                        {meta.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {meta.description}
                      </p>
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
              onClick={() => {
                setEditMode(true);
                setShowAddPanel(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Widget hinzufügen
            </button>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: currentLayout, md: currentLayout, sm: currentLayout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
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
                {/* Drag handle bar — only visible in edit mode */}
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
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
