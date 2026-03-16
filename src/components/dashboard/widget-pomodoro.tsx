"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "focus" | "short" | "long";
const DURATIONS: Record<Phase, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
const LABELS: Record<Phase, string> = { focus: "Fokus", short: "Kurze Pause", long: "Lange Pause" };

export function WidgetPomodoro() {
  const [phase, setPhase] = useState<Phase>("focus");
  const [seconds, setSeconds] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            if (phase === "focus") {
              const next = sessions + 1;
              setSessions(next);
              const nextPhase: Phase = next % 4 === 0 ? "long" : "short";
              setPhase(nextPhase);
              return DURATIONS[nextPhase];
            }
            setPhase("focus");
            return DURATIONS.focus;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, sessions]);

  const reset = () => { setRunning(false); setSeconds(DURATIONS[phase]); };
  const switchPhase = (p: Phase) => { setRunning(false); setPhase(p); setSeconds(DURATIONS[p]); };

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const progress = 1 - seconds / DURATIONS[phase];
  const circumference = 2 * Math.PI * 40;

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <div className="flex gap-1.5">
        {(["focus", "short", "long"] as Phase[]).map((p) => (
          <button key={p} onClick={() => switchPhase(p)}
            className={cn("text-[10px] px-2 py-0.5 rounded-full transition-colors",
              phase === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {LABELS[p]}
          </button>
        ))}
      </div>
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="6" className="stroke-muted" />
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="6"
            className={phase === "focus" ? "stroke-primary" : "stroke-emerald-500"}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums">{mins}:{secs}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setRunning((v) => !v)}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity">
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button onClick={reset} className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors">
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">{sessions} Session{sessions !== 1 ? "s" : ""} heute</p>
    </div>
  );
}
