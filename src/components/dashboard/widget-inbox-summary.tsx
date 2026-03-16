"use client";

import Image from "next/image";
import type { Message } from "@/lib/mock-data";

interface WidgetInboxSummaryProps {
  messages: Message[];
  onOpenInbox: () => void;
}

const SOURCE_META: Record<string, { label: string; iconPath: string }> = {
  gmail: { label: "Gmail", iconPath: "/ServiceLogos/Gmail.svg" },
  slack: { label: "Slack", iconPath: "/ServiceLogos/Slack.svg" },
  teams: { label: "Teams", iconPath: "/ServiceLogos/Microsoft Teams.svg" },
  outlook: { label: "Outlook", iconPath: "/ServiceLogos/Outlook.svg" },
};

export function WidgetInboxSummary({ messages, onOpenInbox }: WidgetInboxSummaryProps) {
  const sources = Object.entries(SOURCE_META)
    .map(([source, meta]) => ({
      source,
      ...meta,
      unread: messages.filter((m) => m.source === source && m.status === "unread").length,
      total: messages.filter((m) => m.source === source).length,
    }))
    .filter((s) => s.total > 0);

  const totalUnread = sources.reduce((sum, s) => sum + s.unread, 0);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Posteingang
        </span>
        {totalUnread > 0 && (
          <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
            {totalUnread} neu
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine verbundenen Konten.</p>
        ) : (
          sources.map((s) => (
            <button
              key={s.source}
              onClick={onOpenInbox}
              className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted transition-colors w-full"
            >
              <div className="flex items-center gap-2">
                <Image src={s.iconPath} alt={s.label} width={16} height={16} />
                <span className="text-sm text-foreground">{s.label}</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {s.unread > 0 ? (
                  <span className="font-semibold text-foreground">{s.unread} ungelesen</span>
                ) : (
                  "alles gelesen"
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
