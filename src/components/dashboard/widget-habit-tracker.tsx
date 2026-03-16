"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_HABITS = ["Sport", "Lesen", "Meditation", "Wasser", "Frühstück"];
const STORAGE_KEY = "nexaro-habits";

function weekDates(): string[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function WidgetHabitTracker() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const days = weekDates();
  const today = new Date().toISOString().slice(0, 10);
  const LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  const toggle = (habit: string, date: string) => {
    const key = `${habit}::${date}`;
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gewohnheiten diese Woche</span>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              <th className="text-left text-muted-foreground font-medium pb-1 pr-2 w-24">Gewohnheit</th>
              {days.map((d, i) => (
                <th key={d} className={cn("text-center font-medium pb-1", d === today ? "text-primary" : "text-muted-foreground")}>
                  {LABELS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEFAULT_HABITS.map((habit) => (
              <tr key={habit}>
                <td className="text-foreground pr-2 py-1 text-xs truncate max-w-[80px]">{habit}</td>
                {days.map((d) => {
                  const key = `${habit}::${d}`;
                  const done = checked.has(key);
                  const isToday = d === today;
                  return (
                    <td key={d} className="text-center py-0.5">
                      <button
                        onClick={() => toggle(habit, d)}
                        className={cn(
                          "w-5 h-5 rounded-md mx-auto block transition-colors",
                          done ? "bg-primary" : isToday ? "bg-muted border border-primary/40 hover:bg-primary/20" : "bg-muted hover:bg-muted/80"
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
