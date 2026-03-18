"use client";

import { Mic, MicOff } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

// ── Web Speech API types ─────────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// ── Props ────────────────────────────────────────────────────────────────────

interface AIVoiceInputProps {
  /** Called when recording starts */
  onStart?: () => void;
  /** Called when recording stops, with total duration in seconds */
  onStop?: (duration: number) => void;
  /**
   * Called whenever the recognizer produces a result.
   * `isFinal=true` means the word/sentence is confirmed; `false` means it's interim.
   */
  onTranscript?: (text: string, isFinal: boolean) => void;
  /** BCP-47 language tag, default "de-DE" */
  language?: string;
  visualizerBars?: number;
  /** Demo mode: cycles through animated state automatically */
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

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
  const [isListening, setIsListening] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isDemo, setIsDemo] = useState(demoMode);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!SR) setIsSupported(false);
    }
  }, []);

  // Demo cycling
  useEffect(() => {
    if (!isDemo) return;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const run = () => {
      setIsListening(true);
      t1 = setTimeout(() => {
        setIsListening(false);
        t2 = setTimeout(run, 1000);
      }, demoInterval);
    };
    const init = setTimeout(run, 100);
    return () => { clearTimeout(init); clearTimeout(t1); clearTimeout(t2); };
  }, [isDemo, demoInterval]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    onStop?.(timeRef.current);
    setIsListening(false);
    setTime(0);
    timeRef.current = 0;
  }, [onStop]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = language;

    rec.onstart = () => {
      setIsListening(true);
      onStart?.();
      timeRef.current = 0;
      timerRef.current = setInterval(() => {
        timeRef.current += 1;
        setTime((t) => t + 1);
      }, 1000);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (final) onTranscript?.(final, true);
      else if (interim) onTranscript?.(interim, false);
    };

    rec.onerror = () => { stopListening(); };

    rec.onend = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsListening(false);
      setTime(0);
      timeRef.current = 0;
    };

    recognitionRef.current = rec;
    rec.start();
  }, [language, onStart, onTranscript, stopListening]);

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
      setIsListening(false);
      return;
    }
    if (isListening) stopListening();
    else startListening();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isSupported) {
    return (
      <div className={cn("w-full py-4", className)}>
        <div className="flex flex-col items-center gap-2 text-center">
          <MicOff className="w-6 h-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Speech recognition is not supported in this browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        <button
          className={cn(
            "group w-16 h-16 rounded-xl flex items-center justify-center transition-colors",
            isListening
              ? "bg-none"
              : "bg-none hover:bg-black/10 dark:hover:bg-white/10",
          )}
          type="button"
          onClick={handleClick}
          aria-label={isListening ? "Stop recording" : "Start recording"}
        >
          {isListening ? (
            <div
              className="w-6 h-6 rounded-sm animate-spin bg-primary cursor-pointer"
              style={{ animationDuration: "3s" }}
            />
          ) : (
            <Mic className="w-6 h-6 text-black/70 dark:text-white/70" />
          )}
        </button>

        <span
          className={cn(
            "font-mono text-sm transition-opacity duration-300",
            isListening
              ? "text-black/70 dark:text-white/70"
              : "text-black/30 dark:text-white/30",
          )}
        >
          {formatTime(time)}
        </span>

        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                isListening
                  ? "bg-primary/50 animate-pulse"
                  : "bg-black/10 dark:bg-white/10 h-1",
              )}
              style={
                isListening && isClient
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
          {isListening ? "Listening…" : "Click to speak"}
        </p>
      </div>
    </div>
  );
}
