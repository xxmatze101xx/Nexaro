"use client";

import { Trophy } from "lucide-react";

const LEADERBOARD = [
  { name: "Sarah Klein", role: "Dev", score: 1247, deals: 0, badge: "🏆" },
  { name: "Tom Weber", role: "Sales", score: 1183, deals: 14, badge: "🥈" },
  { name: "Anna Müller", role: "CTO", score: 1156, deals: 0, badge: "🥉" },
  { name: "Max Braun", role: "Design", score: 987, deals: 0, badge: "" },
  { name: "Lea Fischer", role: "Marketing", score: 943, deals: 0, badge: "" },
  { name: "Jan Schmidt", role: "DevOps", score: 912, deals: 0, badge: "" },
];

export function WidgetLeaderboard() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <Trophy className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Leaderboard</span>
        <span className="text-[10px] text-muted-foreground ml-auto">März 2026</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {LEADERBOARD.map((member, i) => (
          <div key={member.name} className={`flex items-center gap-2.5 p-2 rounded-lg ${i === 0 ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-muted/40 transition-colors"}`}>
            <span className="text-sm w-5 text-center">{member.badge || `${i + 1}`}</span>
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {member.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground leading-none truncate">{member.name}</p>
              <p className="text-[10px] text-muted-foreground">{member.role}</p>
            </div>
            <span className="text-sm font-bold tabular-nums text-foreground">{member.score.toLocaleString("de-DE")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
