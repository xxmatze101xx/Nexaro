"use client";

import { cn } from "@/lib/utils";

const PROJECTS = [
  { name: "Nexaro v2.0", progress: 72, status: "on-track", due: "Apr 15" },
  { name: "API Integration", progress: 45, status: "at-risk", due: "Mär 28" },
  { name: "Mobile App", progress: 18, status: "behind", due: "Jun 1" },
  { name: "Analytics Dashboard", progress: 91, status: "on-track", due: "Mär 20" },
  { name: "Customer Portal", progress: 60, status: "on-track", due: "Mai 10" },
];

const STATUS_META = {
  "on-track": { label: "Im Plan", color: "bg-emerald-500" },
  "at-risk": { label: "Risiko", color: "bg-amber-500" },
  "behind": { label: "Verzögert", color: "bg-red-500" },
};

export function WidgetProjectStatus() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projektstatus</span>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
        {PROJECTS.map((p) => {
          const meta = STATUS_META[p.status as keyof typeof STATUS_META];
          return (
            <div key={p.name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-muted-foreground">Fällig: {p.due}</span>
                  <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white", meta.color)}>{meta.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", meta.color)} style={{ width: `${p.progress}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums">{p.progress}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
