"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function WidgetCalendarMini() {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prev = () => setView(new Date(year, month - 1, 1));
  const next = () => setView(new Date(year, month + 1, 1));

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <button onClick={prev} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"><ChevronLeft className="w-3.5 h-3.5" /></button>
        <span className="text-xs font-semibold text-foreground capitalize">
          {view.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
        </span>
        <button onClick={next} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"><ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 flex-1">
        {DAYS.map((d) => (
          <div key={d} className="text-[9px] font-semibold text-muted-foreground text-center py-0.5">{d}</div>
        ))}
        {cells.map((day, i) => {
          const isToday = day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div key={i} className={cn(
              "text-[11px] text-center py-1 rounded-md leading-none",
              day === null ? "" : "hover:bg-muted cursor-pointer",
              isToday ? "bg-primary text-primary-foreground font-bold hover:bg-primary" : day ? "text-foreground" : ""
            )}>
              {day ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
