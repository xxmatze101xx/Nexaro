"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

export function WidgetTimer() {
  const [inputMins, setInputMins] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const reset = () => { setRunning(false); setStarted(false); setSeconds(inputMins * 60); };
  const start = () => { setSeconds(inputMins * 60); setStarted(true); setRunning(true); };

  const pct = started ? 1 - seconds / (inputMins * 60) : 0;
  const circumference = 2 * Math.PI * 40;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const done = seconds === 0;

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timer</span>
      {!started ? (
        <div className="flex items-center gap-2">
          <button onClick={() => setInputMins(Math.max(1, inputMins - 1))} className="w-8 h-8 rounded-full bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center">−</button>
          <span className="text-2xl font-bold w-16 text-center tabular-nums">{inputMins} Min</span>
          <button onClick={() => setInputMins(Math.min(120, inputMins + 1))} className="w-8 h-8 rounded-full bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center">+</button>
        </div>
      ) : (
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="6" className="stroke-muted" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="6" strokeLinecap="round"
              className={done ? "stroke-emerald-500" : "stroke-primary"}
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold tabular-nums">{done ? "✓" : `${mins}:${secs}`}</span>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {!started ? (
          <button onClick={start} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-80">
            <Play className="w-3 h-3" /> Starten
          </button>
        ) : (
          <>
            <button onClick={() => setRunning((v) => !v)} className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80">
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button onClick={reset} className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:text-foreground">
              <RotateCcw className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
