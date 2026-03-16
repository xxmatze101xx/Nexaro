"use client";

import { Rss, ExternalLink } from "lucide-react";

const FEEDS = [
  { source: "Paul Graham", title: "How to think for yourself", time: "vor 1 Tag" },
  { source: "Benedict Evans", title: "AI and the economics of software", time: "vor 2 Tagen" },
  { source: "Stratechery", title: "The platform era is over", time: "vor 3 Tagen" },
  { source: "Morning Brew", title: "The week in business: 5 things to know", time: "heute" },
  { source: "First Round Review", title: "Lessons from 500 founders", time: "vor 4 Tagen" },
];

export function WidgetRssReader() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <Rss className="w-3.5 h-3.5 text-orange-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">RSS Reader</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {FEEDS.map((f, i) => (
          <div key={i} className="flex items-start gap-2 group cursor-pointer p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground leading-snug group-hover:text-primary transition-colors">{f.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium text-muted-foreground">{f.source}</span>
                <span className="text-[9px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">{f.time}</span>
              </div>
            </div>
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
