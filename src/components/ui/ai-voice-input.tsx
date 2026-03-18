"use client";

import { Mic } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  /** Called with the final transcript once Whisper returns */
  onTranscript?: (text: string, isFinal: boolean) => void;
  /** BCP-47 tag sent to Whisper, e.g. "de-DE" or "en-US" */
  language?: string;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
}

export function AIVoiceInput({
  onStart,
  onStop,
  onTranscript,
  language = "de-DE",
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className,
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false);   // recording
  const [transcribing, setTranscribing] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeRef = useRef(0);

  useEffect(() => { setIsClient(true); }, []);

  // Demo mode cycling (visual only)
  useEffect(() => {
    if (!isDemo) return;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const run = () => {
      setSubmitted(true);
      t1 = setTimeout(() => {
        setSubmitted(false);
        t2 = setTimeout(run, 1000);
      }, demoInterval);
    };
    const init = setTimeout(run, 100);
    return () => { clearTimeout(init); clearTimeout(t1); clearTimeout(t2); };
  }, [isDemo, demoInterval]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    onStop?.(timeRef.current);
    setSubmitted(false);
    setTime(0);
    timeRef.current = 0;
    mediaRecorderRef.current?.stop(); // triggers onstop → transcription
  }, [onStop]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) return; // nothing recorded

        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          form.append("language", language);

          const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
          const data = (await res.json()) as { text?: string; error?: string };

          if (data.text) {
            onTranscript?.(data.text.trim(), true);
          } else {
            setError(data.error ?? "Transcription failed.");
          }
        } catch {
          setError("Could not reach transcription service.");
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setSubmitted(true);
      onStart?.();

      timeRef.current = 0;
      timerRef.current = setInterval(() => {
        timeRef.current += 1;
        setTime((t) => t + 1);
      }, 1000);
    } catch {
      setError("Microphone access denied.");
    }
  }, [language, onStart, onTranscript]);

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
      setSubmitted(false);
      return;
    }
    if (transcribing) return; // busy
    if (submitted) stopRecording();
    else void startRecording();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        <button
          className={cn(
            "group w-16 h-16 rounded-xl flex items-center justify-center transition-colors",
            submitted
              ? "bg-none"
              : "bg-none hover:bg-black/10 dark:hover:bg-white/10",
          )}
          type="button"
          onClick={handleClick}
          disabled={transcribing}
          aria-label={submitted ? "Stop recording" : "Start recording"}
        >
          {transcribing ? (
            <div className="w-6 h-6 rounded-sm animate-spin bg-black dark:bg-white opacity-60"
              style={{ animationDuration: "1s" }} />
          ) : submitted ? (
            <div
              className="w-6 h-6 rounded-sm animate-spin bg-black dark:bg-white cursor-pointer pointer-events-auto"
              style={{ animationDuration: "3s" }}
            />
          ) : (
            <Mic className="w-6 h-6 text-black/70 dark:text-white/70" />
          )}
        </button>

        <span
          className={cn(
            "font-mono text-sm transition-opacity duration-300",
            submitted
              ? "text-black/70 dark:text-white/70"
              : "text-black/30 dark:text-white/30",
          )}
        >
          {transcribing ? "Transcribing…" : formatTime(time)}
        </span>

        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                submitted
                  ? "bg-black/50 dark:bg-white/50 animate-pulse"
                  : "bg-black/10 dark:bg-white/10 h-1",
              )}
              style={
                submitted && isClient
                  ? {
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.05}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="h-4 text-xs text-black/70 dark:text-white/70">
          {transcribing
            ? "Processing your voice…"
            : submitted
            ? "Listening…"
            : "Click to speak"}
        </p>

        {error && (
          <p className="text-xs text-destructive text-center max-w-[240px]">{error}</p>
        )}
      </div>
    </div>
  );
}
