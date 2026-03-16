"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";

interface Decision { id: string; text: string; date: string; }
const STORAGE_KEY = "nexaro-decisions";

const SEED: Decision[] = [
  { id: "1", text: "Auf Cloud-First-Strategie umsteigen", date: "2026-03-15" },
  { id: "2", text: "Next.js als Frontend-Framework beibehalten", date: "2026-03-10" },
  { id: "3", text: "Firebase als primäre DB verwenden", date: "2026-03-05" },
];

export function WidgetDecisionLog() {
  const [decisions, setDecisions] = useState<Decision[]>(SEED);
  const [input, setInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDecisions(JSON.parse(raw) as Decision[]);
    } catch {}
  }, []);

  const persist = (next: Decision[]) => {
    setDecisions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const add = () => {
    if (!input.trim()) return;
    persist([{ id: Date.now().toString(), text: input.trim(), date: new Date().toISOString().slice(0, 10) }, ...decisions]);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entscheidungsprotokoll</span>
      <div className="flex gap-1.5 shrink-0">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Neue Entscheidung..." className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <button onClick={add} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {decisions.map((d) => (
          <div key={d.id} className="flex items-start gap-2 group p-2 rounded-lg bg-muted/40">
            <div className="flex-1">
              <p className="text-xs text-foreground leading-snug">{d.text}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{d.date}</p>
            </div>
            <button onClick={() => persist(decisions.filter((x) => x.id !== d.id))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all mt-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
