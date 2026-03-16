"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

const DURATIONS = [5, 10, 15, 20];

export function WidgetMeditation() {
  const [duration, setDuration] = useState(10);
  const [seconds, setSeconds] = useState(duration * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSeconds(duration * 60);
    setRunning(false);
  }, [duration]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => { if (s <= 1) { clearInterval(intervalRef.current!); setRunning(false); return 0; } return s - 1; });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const pct = 1 - seconds / (duration * 60);
  const circumference = 2 * Math.PI * 36;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meditation</span>
      <div className="flex gap-1.5">
        {DURATIONS.map((d) => (
          <button key={d} onClick={() => setDuration(d)}
            className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${duration === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {d} Min
          </button>
        ))}
      </div>
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r="36" fill="none" strokeWidth="5" className="stroke-muted" />
          <circle cx="45" cy="45" r="36" fill="none" strokeWidth="5" strokeLinecap="round"
            className="stroke-violet-500" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold tabular-nums">{mins}:{secs}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setRunning((v) => !v)}
          className="w-9 h-9 rounded-full bg-violet-500 text-white flex items-center justify-center hover:opacity-80 transition-opacity">
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button onClick={() => { setRunning(false); setSeconds(duration * 60); }}
          className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:text-foreground">
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
