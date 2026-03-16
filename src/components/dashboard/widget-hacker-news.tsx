"use client";

import { ExternalLink, ArrowUp } from "lucide-react";

const STORIES = [
  { title: "Show HN: I built a Rust-based database that handles 10M req/s", points: 847, comments: 234, time: "vor 2 Std" },
  { title: "Why I quit my $500K job at Google to build a solo SaaS", points: 712, comments: 456, time: "vor 3 Std" },
  { title: "The case against microservices in 2026", points: 634, comments: 312, time: "vor 5 Std" },
  { title: "Ask HN: What's your most productive morning routine?", points: 523, comments: 389, time: "vor 6 Std" },
  { title: "LLMs can now reason about code better than senior engineers", points: 489, comments: 278, time: "vor 8 Std" },
];

export function WidgetHackerNews() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hacker News</span>
        <span className="text-[10px] text-orange-500 font-bold">Top Stories</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {STORIES.map((s, i) => (
          <div key={i} className="flex items-start gap-2 group cursor-pointer p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 mt-0.5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground leading-snug group-hover:text-orange-500 transition-colors">{s.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5 text-[10px] text-orange-500"><ArrowUp className="w-2.5 h-2.5" />{s.points}</span>
                <span className="text-[10px] text-muted-foreground">{s.comments} Kommentare</span>
                <span className="text-[10px] text-muted-foreground">{s.time}</span>
              </div>
            </div>
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
