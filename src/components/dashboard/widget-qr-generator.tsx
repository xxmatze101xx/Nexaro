"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { RichButton } from "@/components/ui/rich-button";

export function WidgetQrGenerator() {
  const [url, setUrl] = useState("https://nexaro.io");
  const [generated, setGenerated] = useState(false);

  // We use a public QR API for generation
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 shrink-0">
        <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">QR-Code Generator</span>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <input value={url} onChange={(e) => { setUrl(e.target.value); setGenerated(false); }}
          onKeyDown={(e) => e.key === "Enter" && setGenerated(true)}
          placeholder="URL oder Text..." className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-muted border border-border/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <RichButton onClick={() => setGenerated(true)} size="sm" color="purple">
          QR
        </RichButton>
      </div>
      <div className="flex-1 flex items-center justify-center">
        {generated && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt="QR Code" className="rounded-xl border border-border/50 max-h-full" width={150} height={150} />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <QrCode className="w-12 h-12 opacity-20" />
            <p className="text-xs">URL eingeben und QR generieren</p>
          </div>
        )}
      </div>
    </div>
  );
}
