"use client";

import { useEffect, useRef, useState } from "react";

const HEADLINES = [
  "🚀 Nexaro v2.0 Launch erfolgreich — 3.000+ neue Anmeldungen",
  "📈 DAX steigt um 1,4% — Technologieaktien führen Rallye an",
  "🤖 OpenAI stellt GPT-5 vor — revolutionäre Reasoning-Fähigkeiten",
  "💼 TechCorp-Deal abgeschlossen — Nexaro gewinnt Enterprise-Kunden",
  "🌍 EU verabschiedet KI-Regulierung — neue Compliance-Anforderungen",
  "📊 Q4 Zahlen: SaaS-Sektor wächst 28% gegenüber Vorjahr",
];

export function WidgetNewsTicker() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % HEADLINES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center h-full gap-3">
      <span className="text-[10px] font-bold text-primary uppercase tracking-widest shrink-0">LIVE</span>
      <div className="flex-1 overflow-hidden h-5 relative">
        <p key={idx} className="text-xs text-foreground absolute inset-0 flex items-center animate-in slide-in-from-right duration-500">
          {HEADLINES[idx]}
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        {HEADLINES.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-primary" : "bg-muted hover:bg-muted-foreground"}`} />
        ))}
      </div>
    </div>
  );
}
