import { NextResponse } from "next/server";

interface YahooMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  currency?: string;
}

interface YahooQuote {
  close?: (number | null)[];
}

interface YahooResult {
  meta?: YahooMeta;
  indicators?: {
    quote?: YahooQuote[];
  };
}

interface YahooResponse {
  chart?: {
    result?: YahooResult[];
    error?: { code: string; description: string };
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = (searchParams.get("symbols") ?? "AAPL,MSFT,GOOGL")
    .split(",")
    .slice(0, 5)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Nexaro/1.0)" },
          next: { revalidate: 300 },
        });
        const data = (await res.json()) as YahooResponse;
        const result = data?.chart?.result?.[0];
        const meta = result?.meta;
        const closes =
          result?.indicators?.quote?.[0]?.close?.filter(
            (c): c is number => c !== null && c !== undefined
          ) ?? [];
        const prevClose = closes[closes.length - 2] ?? meta?.previousClose;
        const currentPrice = meta?.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
        const change =
          prevClose && prevClose > 0
            ? ((currentPrice - prevClose) / prevClose) * 100
            : 0;

        return {
          symbol,
          price: currentPrice,
          change,
          currency: meta?.currency ?? "USD",
        };
      })
    );

    return NextResponse.json({ stocks: results });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
