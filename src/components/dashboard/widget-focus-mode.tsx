"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function WidgetFocusMode() {
  const [active, setActive] = useState(false);
  const [topic, setTopic] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    startRef.current = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-center">
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-colors", active ? "bg-amber-500/20" : "bg-muted")}>
        <Zap className={cn("w-6 h-6 transition-colors", active ? "text-amber-500" : "text-muted-foreground")} />
      </div>
      {active ? (
        <>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{fmt(elapsed)}</p>
            {topic && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">{topic}</p>}
          </div>
          <button onClick={() => setActive(false)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">
            <Square className="w-3 h-3" /> Stoppen
          </button>
        </>
      ) : (
        <>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Woran arbeitest du?"
            className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 text-center" />
          <button onClick={() => setActive(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors">
            <Play className="w-3 h-3" /> Fokus starten
          </button>
        </>
      )}
    </div>
  );
}
