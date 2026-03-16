"use client";

import { cn } from "@/lib/utils";

const TEAM = [
  { name: "Anna Müller", role: "CTO", status: "online" as const },
  { name: "Tom Weber", role: "Head of Sales", status: "busy" as const },
  { name: "Sarah Klein", role: "Lead Dev", status: "online" as const },
  { name: "Max Braun", role: "Design", status: "away" as const },
  { name: "Lea Fischer", role: "Marketing", status: "offline" as const },
  { name: "Jan Schmidt", role: "DevOps", status: "online" as const },
];

const STATUS_META = {
  online: { label: "Online", color: "bg-emerald-500" },
  busy: { label: "Beschäftigt", color: "bg-red-500" },
  away: { label: "Abwesend", color: "bg-amber-500" },
  offline: { label: "Offline", color: "bg-muted-foreground" },
};

export function WidgetTeamStatus() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team-Status</span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{TEAM.filter((m) => m.status === "online").length} online</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {TEAM.map((member) => {
          const meta = STATUS_META[member.status];
          return (
            <div key={member.name} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className={cn("absolute bottom-0 right-0 w-2 h-2 rounded-full border border-card", meta.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground leading-none truncate">{member.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{member.role}</p>
              </div>
              <span className="text-[9px] text-muted-foreground shrink-0">{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
