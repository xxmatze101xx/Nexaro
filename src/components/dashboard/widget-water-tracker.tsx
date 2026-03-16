"use client";

import { useState, useEffect } from "react";
import { Plus, Minus, Droplets } from "lucide-react";

const STORAGE_KEY = "nexaro-water";
const TARGET = 8;

function todayStr() { return new Date().toISOString().slice(0, 10); }

export function WidgetWaterTracker() {
  const [glasses, setGlasses] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { date: string; glasses: number };
        if (data.date === todayStr()) setGlasses(data.glasses);
      }
    } catch {}
  }, []);

  const update = (n: number) => {
    const next = Math.max(0, Math.min(TARGET + 2, n));
    setGlasses(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayStr(), glasses: next }));
  };

  const pct = glasses / TARGET;

  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <div className="flex items-center gap-1.5">
        <Droplets className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wasser-Tracker</span>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => update(glasses - 1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
          <Minus className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-4xl font-bold text-foreground leading-none">{glasses}</p>
          <p className="text-xs text-muted-foreground">von {TARGET} Gläsern</p>
        </div>
        <button onClick={() => update(glasses + 1)} className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:opacity-80 transition-opacity">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-1 justify-center">
        {Array.from({ length: TARGET }, (_, i) => (
          <div key={i} className={`w-4 h-6 rounded-sm transition-colors ${i < glasses ? "bg-blue-500" : "bg-muted"}`} />
        ))}
      </div>
      {glasses >= TARGET && <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">Tagesziel erreicht! 🎉</p>}
    </div>
  );
}
