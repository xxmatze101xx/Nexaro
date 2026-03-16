"use client";

import { useState, useEffect } from "react";
import { Plus, X, Check } from "lucide-react";

interface Task { id: string; text: string; done: boolean; }

const STORAGE_KEY = "nexaro-tasks";

export function WidgetTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(JSON.parse(raw) as Task[]);
    } catch {}
  }, []);

  const persist = (next: Task[]) => {
    setTasks(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const add = () => {
    if (!input.trim()) return;
    persist([...tasks, { id: Date.now().toString(), text: input.trim(), done: false }]);
    setInput("");
  };

  const toggle = (id: string) => persist(tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => persist(tasks.filter((t) => t.id !== id));

  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aufgaben</span>
        {tasks.length > 0 && (
          <span className="text-[10px] text-muted-foreground">{done}/{tasks.length}</span>
        )}
      </div>
      <div className="flex gap-1.5 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Neue Aufgabe..."
          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button onClick={add} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">Keine Aufgaben. Füge eine hinzu!</p>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <button onClick={() => toggle(task.id)}
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${task.done ? "bg-primary border-primary" : "border-border hover:border-primary"}`}>
              {task.done && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
            </button>
            <span className={`flex-1 text-xs ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.text}</span>
            <button onClick={() => remove(task.id)} className="w-4 h-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
