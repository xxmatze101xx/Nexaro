"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Flag } from "lucide-react";

export function WidgetStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed;
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - (startRef.current ?? Date.now()));
      }, 50);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);// eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (ms: number) => {
    const m = String(Math.floor(ms / 60000)).padStart(2, "0");
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
    const c = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");
    return `${m}:${s}.${c}`;
  };

  const reset = () => { setRunning(false); setElapsed(0); setLaps([]); };
  const lap = () => setLaps((prev) => [elapsed, ...prev].slice(0, 5));

  return (
    <div className="flex flex-col items-center gap-2 h-full justify-center">
      <p className="text-3xl font-bold tabular-nums text-foreground">{fmt(elapsed)}</p>
      <div className="flex items-center gap-2">
        <button onClick={() => setRunning((v) => !v)}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity">
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button onClick={lap} disabled={!running}
          className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors disabled:opacity-30">
          <Flag className="w-3 h-3" />
        </button>
        <button onClick={reset}
          className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors">
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
      {laps.length > 0 && (
        <div className="w-full flex flex-col gap-0.5 mt-1">
          {laps.map((l, i) => (
            <div key={i} className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span>Runde {laps.length - i}</span>
              <span className="tabular-nums">{fmt(l)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
