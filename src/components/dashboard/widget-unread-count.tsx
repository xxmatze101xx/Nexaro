"use client";

import { Mail, MessageSquare, Bell } from "lucide-react";

const SOURCES = [
  { icon: Mail, label: "E-Mail", count: 24, color: "text-blue-500" },
  { icon: MessageSquare, label: "Slack", count: 17, color: "text-purple-500" },
  { icon: Bell, label: "Teams", count: 5, color: "text-indigo-500" },
];

export function WidgetUnreadCount() {
  const total = SOURCES.reduce((s, x) => s + x.count, 0);
  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ungelesene Nachrichten</span>
      <div className="flex items-end gap-2">
        <span className="text-5xl font-bold text-foreground leading-none">{total}</span>
        <span className="text-sm text-muted-foreground mb-1">gesamt</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {SOURCES.map(({ icon: Icon, label, count, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <span className="text-xs font-semibold text-foreground tabular-nums">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
