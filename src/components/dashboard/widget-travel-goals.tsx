"use client";

import { MapPin, Check } from "lucide-react";

const DESTINATIONS = [
  { city: "Tokio", country: "Japan", emoji: "🗾", visited: false, planned: "2026 Q3" },
  { city: "New York", country: "USA", emoji: "🗽", visited: true, planned: null },
  { city: "Singapur", country: "Singapur", emoji: "🇸🇬", visited: false, planned: "2026 Q4" },
  { city: "São Paulo", country: "Brasilien", emoji: "🇧🇷", visited: false, planned: null },
  { city: "Dubai", country: "VAE", emoji: "🇦🇪", visited: true, planned: null },
  { city: "Sydney", country: "Australien", emoji: "🦘", visited: false, planned: "2027" },
];

export function WidgetTravelGoals() {
  const visited = DESTINATIONS.filter((d) => d.visited).length;
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reiseziele</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{visited}/{DESTINATIONS.length} bereist</span>
      </div>
      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 content-start">
        {DESTINATIONS.map((d) => (
          <div key={d.city} className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${d.visited ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-muted/30"}`}>
            <span className="text-xl">{d.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{d.city}</p>
              <p className="text-[9px] text-muted-foreground">{d.visited ? "✓ Bereist" : d.planned ?? "Geplant"}</p>
            </div>
            {d.visited && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
