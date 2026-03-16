"use client";

import { Image as ImageIcon, Camera } from "lucide-react";

const MEMORIES = [
  { title: "Team-Offsite Hamburg", date: "März 2025", emoji: "🏙" },
  { title: "Produktlaunch v1.0", date: "Jan 2025", emoji: "🚀" },
  { title: "Series A Abschluss", date: "Nov 2024", emoji: "🥂" },
  { title: "Erstes Büro eingeweiht", date: "Aug 2024", emoji: "🏢" },
];

function getDayIndex() {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
}

export function WidgetPhotoMemory() {
  const memory = MEMORIES[getDayIndex() % MEMORIES.length];
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <Camera className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Erinnerung des Tages</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/50">
        <span className="text-6xl">{memory.emoji}</span>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{memory.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{memory.date}</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">Bilder werden mit der Galerie-Integration angezeigt</p>
    </div>
  );
}
