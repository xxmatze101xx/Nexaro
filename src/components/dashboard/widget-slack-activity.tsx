"use client";

import Image from "next/image";

const CHANNELS = [
  { name: "#general", unread: 12, lastMsg: "Max: 'Deployment war erfolgreich!'", time: "vor 2 Min" },
  { name: "#engineering", unread: 5, lastMsg: "Sarah: 'PR #247 ready for review'", time: "vor 8 Min" },
  { name: "#sales", unread: 3, lastMsg: "Tom: 'Deal mit TechCorp geclosed!'", time: "vor 15 Min" },
  { name: "#ceo-updates", unread: 0, lastMsg: "Anna: 'Q1 report attached'", time: "vor 1 Std" },
  { name: "#design", unread: 1, lastMsg: "Lea: 'Neue Mockups hochgeladen'", time: "vor 2 Std" },
];

export function WidgetSlackActivity() {
  const totalUnread = CHANNELS.reduce((s, c) => s + c.unread, 0);
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Image src="/ServiceLogos/Slack.svg" alt="Slack" width={14} height={14} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slack</span>
        </div>
        {totalUnread > 0 && (
          <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">{totalUnread} neu</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
        {CHANNELS.map((ch) => (
          <div key={ch.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer">
            <span className="text-xs font-medium text-foreground w-28 shrink-0 truncate">{ch.name}</span>
            <span className="text-[10px] text-muted-foreground flex-1 truncate">{ch.lastMsg}</span>
            <div className="shrink-0 flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">{ch.time}</span>
              {ch.unread > 0 && (
                <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1 py-0.5 rounded-full min-w-[16px] text-center">{ch.unread}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
