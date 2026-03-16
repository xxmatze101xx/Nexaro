"use client";

import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";

const STORAGE_KEY = "nexaro-journal";
const todayStr = () => new Date().toISOString().slice(0, 10);

export function WidgetJournal() {
  const [entry, setEntry] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Record<string, string>;
        setEntry(data[todayStr()] ?? "");
      }
    } catch {}
  }, []);

  const handleChange = (val: string) => {
    setEntry(val);
    setSaved(false);
    clearTimeout((window as Window & { _journalTimeout?: ReturnType<typeof setTimeout> })._journalTimeout);
    (window as Window & { _journalTimeout?: ReturnType<typeof setTimeout> })._journalTimeout = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const data = raw ? JSON.parse(raw) as Record<string, string> : {};
        data[todayStr()] = val;
        const keys = Object.keys(data).sort().slice(-30);
        const trimmed: Record<string, string> = {};
        keys.forEach((k) => { trimmed[k] = data[k]; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {}
      setSaved(true);
    }, 800);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tagebuch</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}</span>
          <span className={`text-[10px] ${saved ? "text-muted-foreground" : "text-primary"}`}>{saved ? "✓" : "..."}</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground italic shrink-0">Was hat dich heute bewegt? Was hast du gelernt?</p>
      <textarea value={entry} onChange={(e) => handleChange(e.target.value)}
        placeholder="Schreibe hier deine Gedanken für heute..."
        className="flex-1 resize-none text-xs text-foreground placeholder:text-muted-foreground bg-transparent focus:outline-none leading-relaxed" />
    </div>
  );
}
