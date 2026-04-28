"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  // Sync with real DOM state on mount
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("nexaro-dark-mode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("nexaro-dark-mode", "false");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative flex items-center w-14 h-7 rounded-full p-0.5 transition-colors duration-300 focus:outline-none",
        isDark
          ? "bg-zinc-800 border border-zinc-700"
          : "bg-zinc-200 border border-zinc-300",
        className
      )}
    >
      {/* Track icons */}
      <Sun
        className={cn(
          "absolute left-1.5 w-3.5 h-3.5 transition-opacity duration-200",
          isDark ? "opacity-30 text-zinc-500" : "opacity-100 text-amber-500"
        )}
      />
      <Moon
        className={cn(
          "absolute right-1.5 w-3.5 h-3.5 transition-opacity duration-200",
          isDark ? "opacity-100 text-zinc-300" : "opacity-30 text-zinc-500"
        )}
      />
      {/* Thumb */}
      <span
        className={cn(
          "relative z-10 flex w-6 h-6 rounded-full shadow transition-transform duration-300",
          isDark
            ? "translate-x-7 bg-zinc-950"
            : "translate-x-0 bg-white"
        )}
      />
    </button>
  );
}
