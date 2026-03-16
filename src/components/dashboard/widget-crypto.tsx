"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const CRYPTO = [
  { symbol: "BTC", name: "Bitcoin", price: 67420.50, change: 2.34, color: "text-amber-500" },
  { symbol: "ETH", name: "Ethereum", price: 3284.10, change: -1.22, color: "text-indigo-500" },
  { symbol: "SOL", name: "Solana", price: 142.80, change: 5.67, color: "text-purple-500" },
  { symbol: "BNB", name: "Binance", price: 418.30, change: 0.89, color: "text-amber-400" },
];

export function WidgetCrypto() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kryptowährungen</span>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {CRYPTO.map((c) => (
          <div key={c.symbol} className="flex flex-col justify-center gap-1 p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-bold ${c.color}`}>{c.symbol}</span>
              <span className="text-[10px] text-muted-foreground">{c.name}</span>
            </div>
            <span className="text-base font-bold tabular-nums text-foreground">
              ${c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={cn("flex items-center gap-0.5 text-xs font-semibold",
              c.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {c.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {c.change >= 0 ? "+" : ""}{c.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
