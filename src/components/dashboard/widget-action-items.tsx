"use client";

import { Zap, AlertCircle, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const INITIAL_ITEMS = [
  { id: "1", text: "Vertrag mit TechCorp unterschreiben", source: "E-Mail", urgency: "high", done: false },
  { id: "2", text: "Budget für Q2 freigeben", source: "Slack", urgency: "high", done: false },
  { id: "3", text: "Interview-Feedback für Sarah einreichen", source: "E-Mail", urgency: "medium", done: false },
  { id: "4", text: "Quarterly Review Termin bestätigen", source: "Kalender", urgency: "medium", done: true },
  { id: "5", text: "Technischen Blog-Post reviewen", source: "Teams", urgency: "low", done: false },
];

export function WidgetActionItems() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const toggle = (id: string) => setItems((prev) => prev.map((i) => i.id === id ? { ...i, done: !i.done } : i));
  const open = items.filter((i) => !i.done).length;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action Items</span>
        </div>
        <span className="text-[10px] font-medium text-primary">{open} offen</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {items.map((item) => (
          <div key={item.id} className={cn("flex items-start gap-2 p-2 rounded-lg transition-colors", item.done ? "opacity-50" : item.urgency === "high" ? "bg-destructive/5 border border-destructive/20" : "hover:bg-muted/40")}>
            <button onClick={() => toggle(item.id)}
              className={cn("w-4 h-4 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-colors", item.done ? "bg-primary border-primary" : "border-border hover:border-primary")}>
              {item.done && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs leading-snug", item.done ? "line-through text-muted-foreground" : "text-foreground")}>{item.text}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-muted-foreground">{item.source}</span>
                {item.urgency === "high" && !item.done && <AlertCircle className="w-2.5 h-2.5 text-destructive" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
