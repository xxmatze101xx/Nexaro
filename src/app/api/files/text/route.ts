import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PREFIXES = [
  "https://firebasestorage.googleapis.com/",
  "https://storage.googleapis.com/",
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  // Manual timeout via Promise.race — more reliable than AbortSignal.timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const upstream = await Promise.race([
      fetch(url, { signal: controller.signal }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 10000)
      ),
    ]);

    clearTimeout(timeoutId);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream HTTP ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
