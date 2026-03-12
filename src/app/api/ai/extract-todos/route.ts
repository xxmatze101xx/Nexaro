import { NextRequest, NextResponse } from "next/server";

interface ExtractedTodo {
    title: string;
    priority: "low" | "medium" | "high" | "urgent";
    deadline: string | null;
    confidence: number;
}

const SYSTEM_PROMPT = `Du bist ein Assistent für einen CEO. Analysiere die folgende E-Mail und extrahiere konkrete Aufgaben (Action Items) die der Empfänger erledigen muss.

Für jede Aufgabe gib ein JSON-Objekt zurück mit:
- title: Kurze, actionable Beschreibung (max 100 Zeichen, auf Deutsch)
- priority: "low" | "medium" | "high" | "urgent"
- deadline: Falls im Text ein Datum/Frist erwähnt wird (ISO 8601 YYYY-MM-DD), sonst null
- confidence: 0-1 wie sicher du bist, dass es ein echtes Action Item ist

Regeln:
- Nur konkrete Aufgaben, keine allgemeinen Informationen
- "Bitte sende mir den Bericht" → Aufgabe
- "Zur Info: der Bericht ist fertig" → KEINE Aufgabe
- Erkenne implizite Deadlines: "bis Freitag" → nächster Freitag
- Erkenne Dringlichkeit: "ASAP", "dringend", "sofort" → priority: urgent
- Wenn KEINE Aufgaben gefunden: leeres Array zurückgeben

Antworte NUR mit einem JSON-Array. Kein Markdown, kein Text drumherum.
Beispiel: [{"title":"Vertrag unterschreiben","priority":"high","deadline":"2026-03-15","confidence":0.92}]`;

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as {
            subject?: string;
            sender?: string;
            body?: string;
        };

        if (!body.body) {
            return NextResponse.json({ error: "Kein E-Mail-Body angegeben." }, { status: 400 });
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            return NextResponse.json(
                { error: "AI nicht verfügbar: Kein GEMINI_API_KEY konfiguriert." },
                { status: 503 },
            );
        }

        const userPrompt = `E-Mail:
Betreff: ${body.subject ?? "(kein Betreff)"}
Von: ${body.sender ?? "(unbekannt)"}
---
${body.body.slice(0, 4000)}`;

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] },
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1024,
                    },
                }),
            },
        );

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error("[extract-todos] Gemini API error:", geminiRes.status, errText);
            return NextResponse.json(
                { error: `AI-Fehler: ${geminiRes.status}` },
                { status: 502 },
            );
        }

        const geminiData = (await geminiRes.json()) as {
            candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
            }>;
        };

        const rawText =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

        // Parse JSON from response (strip markdown fences if present)
        let jsonStr = rawText.trim();
        if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        }

        let todos: ExtractedTodo[];
        try {
            todos = JSON.parse(jsonStr) as ExtractedTodo[];
            if (!Array.isArray(todos)) todos = [];
        } catch {
            console.error("[extract-todos] Failed to parse AI response:", jsonStr);
            todos = [];
        }

        // Validate & sanitize
        todos = todos
            .filter(
                (t) =>
                    typeof t.title === "string" &&
                    t.title.length > 0 &&
                    t.title.length <= 200,
            )
            .map((t) => ({
                title: t.title.slice(0, 200),
                priority:
                    (["low", "medium", "high", "urgent"] as const).includes(t.priority)
                        ? t.priority
                        : "medium",
                deadline:
                    t.deadline && /^\d{4}-\d{2}-\d{2}/.test(t.deadline)
                        ? t.deadline.slice(0, 10)
                        : null,
                confidence: typeof t.confidence === "number" ? Math.min(1, Math.max(0, t.confidence)) : 0.5,
            }));

        return NextResponse.json({ todos });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[extract-todos] Error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
