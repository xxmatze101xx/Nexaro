"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockData {
  symbol: string;
  price: number;
  change: number;
  currency: string;
}

interface StocksResponse {
  stocks?: StockData[];
  error?: string;
}

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL"];

export function WidgetStocks() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks?symbols=${DEFAULT_SYMBOLS.join(",")}`);
      const data = (await res.json()) as StocksResponse;
      if (data.error) throw new Error(data.error);
      setStocks(data.stocks ?? []);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    const id = setInterval(fetchStocks, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchStocks]);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Aktien
        </span>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground">
              {lastUpdated.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={fetchStocks}
            disabled={loading}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
            title="Aktualisieren"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {loading && stocks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 flex-1">
          {stocks.map((stock) => (
            <div
              key={stock.symbol}
              className="flex flex-col justify-center gap-1 p-3 rounded-xl bg-muted/50"
            >
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {stock.symbol}
              </span>
              <span className="text-lg font-bold tabular-nums text-foreground leading-none">
                {stock.price.toFixed(2)}
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-semibold",
                  stock.change >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {stock.change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {stock.change >= 0 ? "+" : ""}
                {stock.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
