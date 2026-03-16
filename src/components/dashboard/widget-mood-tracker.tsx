"use client";

import { useState, useEffect } from "react";

const MOODS = [
  { emoji: "😄", label: "Super", value: 5, color: "bg-emerald-500" },
  { emoji: "🙂", label: "Gut", value: 4, color: "bg-green-400" },
  { emoji: "😐", label: "Okay", value: 3, color: "bg-amber-400" },
  { emoji: "😔", label: "Mäßig", value: 2, color: "bg-orange-400" },
  { emoji: "😞", label: "Schlecht", value: 1, color: "bg-red-400" },
];

const STORAGE_KEY = "nexaro-mood";
const todayStr = () => new Date().toISOString().slice(0, 10);

export function WidgetMoodTracker() {
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<{ date: string; value: number }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { date: string; value: number }[];
        setHistory(data);
        const today = data.find((d) => d.date === todayStr());
        if (today) setSelected(today.value);
      }
    } catch {}
  }, []);

  const selectMood = (value: number) => {
    setSelected(value);
    const next = history.filter((d) => d.date !== todayStr());
    next.push({ date: todayStr(), value });
    const trimmed = next.slice(-30);
    setHistory(trimmed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  };

  const avg = history.length > 0 ? (history.reduce((s, h) => s + h.value, 0) / history.length).toFixed(1) : null;

  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wie geht es dir heute?</span>
      <div className="flex justify-center gap-2">
        {MOODS.map((m) => (
          <button key={m.value} onClick={() => selectMood(m.value)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${selected === m.value ? "bg-primary/10 scale-110 ring-2 ring-primary/30" : "hover:bg-muted"}`}>
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[9px] text-muted-foreground">{m.label}</span>
          </button>
        ))}
      </div>
      {avg && (
        <p className="text-xs text-muted-foreground text-center">Ø der letzten {history.length} Tage: <span className="font-semibold text-foreground">{avg}/5</span></p>
      )}
    </div>
  );
}
