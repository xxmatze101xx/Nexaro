"use client";

import { useState, useEffect } from "react";
import { Check, Plus, X } from "lucide-react";

interface Goal { id: string; text: string; done: boolean; }
const STORAGE_KEY = "nexaro-goals";
const todayStr = () => new Date().toISOString().slice(0, 10);

export function WidgetGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [input, setInput] = useState("");
  const [lastDate, setLastDate] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { goals: Goal[]; date: string };
        if (data.date === todayStr()) {
          setGoals(data.goals);
          setLastDate(data.date);
        }
      }
    } catch {}
  }, []);

  const persist = (next: Goal[]) => {
    setGoals(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ goals: next, date: todayStr() }));
  };

  const add = () => {
    if (!input.trim()) return;
    persist([...goals, { id: Date.now().toString(), text: input.trim(), done: false }]);
    setInput("");
  };

  const done = goals.filter((g) => g.done).length;
  void lastDate;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tagesziele</span>
        {goals.length > 0 && (
          <span className="text-[10px] font-medium text-primary">{done}/{goals.length} erreicht</span>
        )}
      </div>
      <div className="flex gap-1.5 shrink-0">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Neues Ziel für heute..." className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <button onClick={add} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {goals.map((g) => (
          <div key={g.id} className="flex items-center gap-2 group">
            <button onClick={() => persist(goals.map((x) => x.id === g.id ? { ...x, done: !x.done } : x))}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${g.done ? "bg-emerald-500 border-emerald-500" : "border-border hover:border-primary"}`}>
              {g.done && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className={`flex-1 text-xs ${g.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{g.text}</span>
            <button onClick={() => persist(goals.filter((x) => x.id !== g.id))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {goals.length === 0 && <p className="text-xs text-muted-foreground text-center mt-4">Setze heute deine Ziele!</p>}
      </div>
    </div>
  );
}
