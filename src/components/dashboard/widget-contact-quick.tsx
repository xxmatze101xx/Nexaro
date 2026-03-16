"use client";

import { Phone, Mail } from "lucide-react";

const CONTACTS = [
  { name: "Anna M.", role: "CTO", initials: "AM", color: "bg-violet-500" },
  { name: "Tom W.", role: "Sales", initials: "TW", color: "bg-blue-500" },
  { name: "Sarah K.", role: "Dev", initials: "SK", color: "bg-emerald-500" },
  { name: "Max B.", role: "Design", initials: "MB", color: "bg-amber-500" },
  { name: "Lea F.", role: "Marketing", initials: "LF", color: "bg-pink-500" },
  { name: "Jan S.", role: "DevOps", initials: "JS", color: "bg-cyan-500" },
];

export function WidgetContactQuick() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schnellkontakte</span>
      <div className="flex-1 grid grid-cols-2 gap-1.5 content-start">
        {CONTACTS.map((c) => (
          <div key={c.name} className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer group">
            <div className={`w-8 h-8 rounded-full ${c.color} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
              {c.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground leading-none truncate">{c.name}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{c.role}</p>
            </div>
            <div className="hidden group-hover:flex gap-1">
              <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Mail className="w-3 h-3" />
              </button>
              <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Phone className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
