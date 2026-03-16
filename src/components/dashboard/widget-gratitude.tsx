"use client";

import { useState, useEffect } from "react";
import { Plus, Sparkles } from "lucide-react";

interface GratitudeEntry { id: string; text: string; date: string; }
const STORAGE_KEY = "nexaro-gratitude";
const todayStr = () => new Date().toISOString().slice(0, 10);

export function WidgetGratitude() {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw) as GratitudeEntry[]);
    } catch {}
  }, []);

  const todayEntries = entries.filter((e) => e.date === todayStr());

  const add = () => {
    if (!input.trim() || todayEntries.length >= 3) return;
    const next = [...entries, { id: Date.now().toString(), text: input.trim(), date: todayStr() }];
    setEntries(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-30)));
    setInput("");
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dankbarkeits-Journal</span>
      </div>
      <p className="text-[10px] text-muted-foreground">3 Dinge wofür du heute dankbar bist:</p>
      <div className="flex-1 flex flex-col gap-2">
        {todayEntries.map((e, i) => (
          <div key={e.id} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <span className="text-amber-500 text-xs font-bold shrink-0">{i + 1}.</span>
            <p className="text-xs text-foreground leading-snug">{e.text}</p>
          </div>
        ))}
        {todayEntries.length < 3 && (
          <div className="flex gap-1.5">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder={`${todayEntries.length + 1}. Ich bin dankbar für...`}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
            <button onClick={add} className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center hover:opacity-80 shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {todayEntries.length >= 3 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium text-center">Dankecheck erledigt! ✨</p>
        )}
      </div>
    </div>
  );
}
