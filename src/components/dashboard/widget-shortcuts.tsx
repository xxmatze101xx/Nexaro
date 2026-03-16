"use client";

import { Pencil, Bot, Calendar, Settings, Inbox, FolderOpen } from "lucide-react";
import Link from "next/link";

interface WidgetShortcutsProps {
  onCompose: () => void;
  onAIChat: () => void;
  onInbox: () => void;
}

interface ShortcutItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: "button" | "link";
  href?: string;
  onClick?: () => void;
}

export function WidgetShortcuts({ onCompose, onAIChat, onInbox }: WidgetShortcutsProps) {
  const shortcuts: ShortcutItem[] = [
    {
      id: "compose",
      label: "Neue Mail",
      icon: <Pencil className="w-5 h-5" />,
      type: "button",
      onClick: onCompose,
    },
    {
      id: "inbox",
      label: "Posteingang",
      icon: <Inbox className="w-5 h-5" />,
      type: "button",
      onClick: onInbox,
    },
    {
      id: "ai",
      label: "AI Chat",
      icon: <Bot className="w-5 h-5" />,
      type: "button",
      onClick: onAIChat,
    },
    {
      id: "calendar",
      label: "Kalender",
      icon: <Calendar className="w-5 h-5" />,
      type: "link",
      href: "/calendar",
    },
    {
      id: "files",
      label: "Files",
      icon: <FolderOpen className="w-5 h-5" />,
      type: "link",
      href: "/",
    },
    {
      id: "settings",
      label: "Einstellungen",
      icon: <Settings className="w-5 h-5" />,
      type: "link",
      href: "/settings",
    },
  ];

  const baseClass =
    "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground";

  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Schnellzugriffe
      </span>
      <div className="grid grid-cols-3 gap-2 flex-1">
        {shortcuts.map((s) =>
          s.type === "link" ? (
            <Link key={s.id} href={s.href ?? "/"} className={baseClass}>
              {s.icon}
              <span className="text-[10px] font-medium text-center leading-tight">
                {s.label}
              </span>
            </Link>
          ) : (
            <button key={s.id} onClick={s.onClick} className={baseClass}>
              {s.icon}
              <span className="text-[10px] font-medium text-center leading-tight">
                {s.label}
              </span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
