"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, Plus, X, LayoutGrid } from "lucide-react";
import {
  loadDashboardConfig,
  saveDashboardConfig,
  WIDGET_META,
  type WidgetConfig,
  type WidgetId,
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
  const [config, setConfig] = useState<WidgetConfig[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setConfig(loadDashboardConfig());
    setMounted(true);
  }, []);

  const enabledWidgets = config.filter((w) => w.enabled);
  const disabledWidgets = config.filter((w) => !w.enabled);

  const removeWidget = (id: WidgetId) => {
    const updated = config.map((w) =>
      w.id === id ? { ...w, enabled: false } : w
    );
    setConfig(updated);
    saveDashboardConfig(updated);
  };

  const addWidget = (id: WidgetId) => {
    const updated = config.map((w) =>
      w.id === id ? { ...w, enabled: true } : w
    );
    setConfig(updated);
    saveDashboardConfig(updated);
  };

  const renderWidgetContent = (id: WidgetId) => {
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

  if (!mounted) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 pb-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting(displayName)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {new Date().toLocaleDateString("de-DE", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

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

        {/* Widget Grid */}
        {enabledWidgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
            <LayoutGrid className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">Noch keine Widgets aktiviert.</p>
            <button
              onClick={() => setShowAddPanel(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Widget hinzufügen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[200px]">
            {enabledWidgets.map(({ id }) => {
              const meta = WIDGET_META[id];
              return (
                <div
                  key={id}
                  className={cn(
                    "relative bg-card border border-border rounded-2xl p-5 shadow-sm transition-all",
                    editMode && "ring-2 ring-primary/20",
                    meta.colSpan === 2 && "md:col-span-2"
                  )}
                >
                  {editMode && (
                    <button
                      onClick={() => removeWidget(id)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-80 transition-opacity z-10 shadow-sm"
                      title="Widget entfernen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {renderWidgetContent(id)}
                </div>
              );
            })}

            {/* Add Widget tile — visible in edit mode */}
            {editMode && (
              <div
                className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors p-5"
                onClick={() => setShowAddPanel((v) => !v)}
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">Widget hinzufügen</span>
              </div>
            )}
          </div>
        )}

        {/* Add Widget Panel */}
        {showAddPanel && (
          <div className="mt-6 border border-border rounded-2xl p-5 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                Verfügbare Widgets
              </h3>
              <button
                onClick={() => setShowAddPanel(false)}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {disabledWidgets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Alle Widgets sind bereits aktiv.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {disabledWidgets.map(({ id }) => {
                  const meta = WIDGET_META[id];
                  return (
                    <button
                      key={id}
                      onClick={() => addWidget(id)}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors">
                        <Plus className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {meta.label}
                        </p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">
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
      </div>
    </div>
  );
}
