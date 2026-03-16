"use client";

import { useState, useEffect } from "react";
import { Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nexaro-working-hours";
const TARGET_HOURS = 8;

interface DayRecord { date: string; seconds: number; startTs?: number; }

function todayStr() { return new Date().toISOString().slice(0, 10); }

export function WidgetWorkingHours() {
  const [record, setRecord] = useState<DayRecord>({ date: todayStr(), seconds: 0 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DayRecord;
        if (parsed.date === todayStr()) setRecord(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const currentSeconds = record.startTs
    ? record.seconds + Math.floor((Date.now() - record.startTs) / 1000)
    : record.seconds;

  const toggle = () => {
    setRecord((prev) => {
      const next: DayRecord = prev.startTs
        ? { date: prev.date, seconds: prev.seconds + Math.floor((Date.now() - prev.startTs) / 1000) }
        : { date: prev.date, seconds: prev.seconds, startTs: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const hours = currentSeconds / 3600;
  const pct = Math.min(hours / TARGET_HOURS, 1);
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  const running = !!record.startTs;
  void tick;

  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arbeitsstunden</span>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-foreground">{fmt(currentSeconds)}</span>
        <span className="text-xs text-muted-foreground">Ziel: {TARGET_HOURS}h</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", pct >= 1 ? "bg-emerald-500" : "bg-primary")}
          style={{ width: `${pct * 100}%` }} />
      </div>
      <button onClick={toggle}
        className={cn("flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
          running ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-primary/10 text-primary hover:bg-primary/20")}>
        {running ? <><Square className="w-3 h-3" /> Stoppen</> : <><Play className="w-3 h-3" /> Starten</>}
      </button>
    </div>
  );
}
