"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "nexaro-notes";

export function WidgetNotes() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setText(localStorage.getItem(STORAGE_KEY) ?? "");
  }, []);

  const handleChange = (val: string) => {
    setText(val);
    setSaved(false);
    clearTimeout((window as Window & { _noteTimeout?: ReturnType<typeof setTimeout> })._noteTimeout);
    (window as Window & { _noteTimeout?: ReturnType<typeof setTimeout> })._noteTimeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, val);
      setSaved(true);
    }, 800);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notizen</span>
        <span className={`text-[10px] transition-colors ${saved ? "text-muted-foreground" : "text-primary"}`}>
          {saved ? "Gespeichert" : "Speichert..."}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Gedanken, Ideen, To-dos..."
        className="flex-1 resize-none text-xs text-foreground placeholder:text-muted-foreground bg-transparent focus:outline-none leading-relaxed"
      />
    </div>
  );
}
