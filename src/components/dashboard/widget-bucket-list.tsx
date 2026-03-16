"use client";

import { useState, useEffect } from "react";
import { Check, Plus, X, Star } from "lucide-react";

interface BucketItem { id: string; text: string; done: boolean; }
const STORAGE_KEY = "nexaro-bucket";
const SEED: BucketItem[] = [
  { id: "1", text: "TED Talk halten", done: false },
  { id: "2", text: "Unternehmen auf €10M ARR skalieren", done: false },
  { id: "3", text: "Buch schreiben", done: false },
  { id: "4", text: "Rede am Startup-Summit halten", done: true },
];

export function WidgetBucketList() {
  const [items, setItems] = useState<BucketItem[]>(SEED);
  const [input, setInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as BucketItem[]);
    } catch {}
  }, []);

  const persist = (next: BucketItem[]) => { setItems(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };
  const add = () => { if (!input.trim()) return; persist([...items, { id: Date.now().toString(), text: input.trim(), done: false }]); setInput(""); };

  const done = items.filter((i) => i.done).length;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bucket List</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{done}/{items.length}</span>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Neuer Traum oder Ziel..." className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <button onClick={add} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <button onClick={() => persist(items.map((x) => x.id === item.id ? { ...x, done: !x.done } : x))}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${item.done ? "bg-amber-500 border-amber-500" : "border-border hover:border-amber-500"}`}>
              {item.done && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className={`flex-1 text-xs ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.text}</span>
            <button onClick={() => persist(items.filter((x) => x.id !== item.id))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
