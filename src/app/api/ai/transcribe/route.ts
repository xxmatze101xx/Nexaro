import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    let audioFile: File | null = null;
    let language = "de";

    try {
        const form = await req.formData();
        audioFile = form.get("audio") as File | null;
        const langParam = form.get("language");
        if (typeof langParam === "string") language = langParam.slice(0, 5);
    } catch {
        return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }

    if (!audioFile || audioFile.size === 0) {
        return NextResponse.json({ error: "No audio file received." }, { status: 400 });
    }

    // Forward to OpenAI Whisper
    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, "recording.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", language.slice(0, 2)); // "de-DE" → "de"

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: whisperForm,
    });

    if (!res.ok) {
        const err = await res.text();
        console.error("Whisper error:", err);
        return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
    }

    const data = (await res.json()) as { text?: string };
    const rawText = data.text?.trim() ?? "";

    // Filter known Whisper hallucinations that occur on silence / near-empty audio.
    // Whisper fills silence with credits, subtitles or broadcast idents from its training data.
    const HALLUCINATION_STRINGS = [
        "Untertitel der Amara.org-Community",
        "Amara.org",
        "Vielen Dank für das Zuschauen",
        "Thank you for watching",
        "Subtitles by",
        "Subtitled by",
        "Im Auftrag von",
        "im Auftrag des",
        "Eine Produktion",
        "Ein Film von",
        "Regie:",
        "Produktion:",
        "ZDF",
        "ARD",
        "ORF",
        "©",
        "♪",
        "www.",
        "http",
    ];
    // Also reject very short results that are clearly not real speech (< 3 chars)
    const isHallucination =
        !rawText ||
        rawText.length < 3 ||
        HALLUCINATION_STRINGS.some((h) => rawText.toLowerCase().includes(h.toLowerCase()));
    return NextResponse.json({ text: isHallucination ? "" : rawText });
}
