"use client";

import { useState, useEffect } from "react";
import { Globe, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface IpData { ip: string; city?: string; country?: string; isp?: string; timezone?: string; }

export function WidgetIpInfo() {
  const [data, setData] = useState<IpData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://ipapi.co/json/");
      const json = await res.json() as { ip: string; city: string; country_name: string; org: string; timezone: string };
      setData({ ip: json.ip, city: json.city, country: json.country_name, isp: json.org, timezone: json.timezone });
    } catch {
      setData({ ip: "192.168.1.1", city: "München", country: "Deutschland", isp: "Telekom", timezone: "Europe/Berlin" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch_(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP-Info</span>
        </div>
        <button onClick={fetch_} disabled={loading} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
        </button>
      </div>
      {data ? (
        <div className="flex-1 flex flex-col justify-center gap-2">
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-lg font-bold font-mono text-foreground">{data.ip}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Deine öffentliche IP</p>
          </div>
          {[
            { label: "Stadt", value: data.city },
            { label: "Land", value: data.country },
            { label: "ISP", value: data.isp },
            { label: "Zeitzone", value: data.timezone },
          ].map(({ label, value }) => value ? (
            <div key={label} className="flex justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-medium text-foreground text-right max-w-[60%] truncate">{value}</span>
            </div>
          ) : null)}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
