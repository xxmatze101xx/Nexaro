"use client";

import { Cake } from "lucide-react";

const BIRTHDAYS = [
  { name: "Anna Müller", date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 3), emoji: "🎂" },
  { name: "Thomas Klein", date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 7), emoji: "🎉" },
  { name: "Sarah Weber", date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 14), emoji: "🎁" },
  { name: "Max Braun", date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5), emoji: "🥳" },
  { name: "Lea Fischer", date: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 12), emoji: "🎂" },
];

export function WidgetBirthdayTracker() {
  const today = new Date();
  const sorted = BIRTHDAYS
    .map((b) => {
      let d = new Date(b.date);
      if (d < today) d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
      const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
      return { ...b, daysLeft: diff, date: d };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <Cake className="w-3.5 h-3.5 text-pink-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bevorstehende Geburtstage</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {sorted.map((b) => (
          <div key={b.name} className={`flex items-center gap-2.5 p-2 rounded-xl ${b.daysLeft <= 7 ? "bg-pink-500/5 border border-pink-500/20" : "bg-muted/30"}`}>
            <span className="text-xl">{b.emoji}</span>
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">{b.name}</p>
              <p className="text-[10px] text-muted-foreground">{b.date.toLocaleDateString("de-DE", { day: "numeric", month: "long" })}</p>
            </div>
            <span className={`text-xs font-bold shrink-0 ${b.daysLeft <= 3 ? "text-pink-500" : b.daysLeft <= 7 ? "text-amber-500" : "text-muted-foreground"}`}>
              {b.daysLeft === 0 ? "Heute! 🎉" : b.daysLeft === 1 ? "Morgen!" : `in ${b.daysLeft} Tagen`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
