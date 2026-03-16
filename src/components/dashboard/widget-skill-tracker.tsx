"use client";

import { cn } from "@/lib/utils";

const SKILLS = [
  { name: "Öffentliches Reden", level: 4, max: 5, color: "bg-blue-500" },
  { name: "Finanzkompetenz", level: 3, max: 5, color: "bg-emerald-500" },
  { name: "Programmieren", level: 2, max: 5, color: "bg-purple-500" },
  { name: "Verhandlungsführung", level: 5, max: 5, color: "bg-amber-500" },
  { name: "Storytelling", level: 3, max: 5, color: "bg-pink-500" },
  { name: "KI & Machine Learning", level: 2, max: 5, color: "bg-cyan-500" },
];

export function WidgetSkillTracker() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill Tracker</span>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
        {SKILLS.map((s) => (
          <div key={s.name}>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-foreground">{s.name}</span>
              <span className="text-[10px] text-muted-foreground">Level {s.level}/{s.max}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: s.max }, (_, i) => (
                <div key={i} className={cn("flex-1 h-2 rounded-full transition-colors", i < s.level ? s.color : "bg-muted")} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
