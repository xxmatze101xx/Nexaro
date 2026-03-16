"use client";

import { useState, useEffect } from "react";
import { Plus, X, BookOpen } from "lucide-react";

interface Article { id: string; title: string; url: string; read: boolean; }
const STORAGE_KEY = "nexaro-reading-list";

const SEED: Article[] = [
  { id: "1", title: "The Future of AI in Business", url: "#", read: false },
  { id: "2", title: "How to Build a $100M SaaS", url: "#", read: true },
  { id: "3", title: "Effective Remote Leadership", url: "#", read: false },
];

export function WidgetReadingList() {
  const [articles, setArticles] = useState<Article[]>(SEED);
  const [input, setInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setArticles(JSON.parse(raw) as Article[]);
    } catch {}
  }, []);

  const persist = (next: Article[]) => {
    setArticles(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const add = () => {
    if (!input.trim()) return;
    persist([...articles, { id: Date.now().toString(), title: input.trim(), url: "#", read: false }]);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leseliste</span>
        <span className="text-[10px] text-muted-foreground">{articles.filter((a) => !a.read).length} ungelesen</span>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Artikel-Titel oder URL..." className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <button onClick={add} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {articles.map((a) => (
          <div key={a.id} className="flex items-center gap-2 group p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <BookOpen className={`w-3.5 h-3.5 shrink-0 ${a.read ? "text-muted-foreground" : "text-primary"}`} />
            <span className={`flex-1 text-xs truncate ${a.read ? "line-through text-muted-foreground" : "text-foreground"}`}>{a.title}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => persist(articles.map((x) => x.id === a.id ? { ...x, read: !x.read } : x))}
                className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground">
                {a.read ? "Rückgängig" : "Gelesen"}
              </button>
              <button onClick={() => persist(articles.filter((x) => x.id !== a.id))} className="text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
