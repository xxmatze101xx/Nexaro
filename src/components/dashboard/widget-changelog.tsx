"use client";

import { GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";

const CHANGES = [
  { version: "v2.1.0", date: "16.03.2026", type: "feature", items: ["100+ Dashboard-Widgets", "Kategorie-Filter", "Widget-Suche"] },
  { version: "v2.0.3", date: "10.03.2026", type: "fix", items: ["E-Mail-Body Layout verbessert", "Kalender-Sync Bug behoben"] },
  { version: "v2.0.2", date: "05.03.2026", type: "improvement", items: ["Performance-Optimierungen", "Dark Mode verbessert"] },
  { version: "v2.0.0", date: "01.03.2026", type: "major", items: ["Dashboard mit Widgets", "Aktien-Widget", "Meetings-Widget"] },
];

const TYPE_META = {
  feature: { label: "Feature", color: "bg-primary/10 text-primary" },
  fix: { label: "Bugfix", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  improvement: { label: "Verbesserung", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  major: { label: "Major", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

export function WidgetChangelog() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <GitCommit className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Änderungsprotokoll</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {CHANGES.map((c) => {
          const meta = TYPE_META[c.type as keyof typeof TYPE_META];
          return (
            <div key={c.version} className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-foreground">{c.version}</span>
                <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full", meta.color)}>{meta.label}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{c.date}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {c.items.map((item) => (
                  <div key={item} className="flex items-start gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                    <span className="text-[10px] text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
