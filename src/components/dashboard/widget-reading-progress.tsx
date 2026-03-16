"use client";

import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const BOOKS = [
  { title: "Zero to One", author: "Peter Thiel", pages: 224, read: 224, color: "bg-blue-500" },
  { title: "The Hard Thing About Hard Things", author: "Ben Horowitz", pages: 304, read: 187, color: "bg-emerald-500" },
  { title: "Blitzscaling", author: "Reid Hoffman", pages: 320, read: 96, color: "bg-amber-500" },
  { title: "Measure What Matters", author: "John Doerr", pages: 320, read: 12, color: "bg-purple-500" },
];

export function WidgetReadingProgress() {
  const booksRead = BOOKS.filter((b) => b.read >= b.pages).length;
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lesefortschritt</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{booksRead}/{BOOKS.length} gelesen</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
        {BOOKS.map((book) => {
          const pct = Math.min(book.read / book.pages, 1);
          const done = book.read >= book.pages;
          return (
            <div key={book.title}>
              <div className="flex justify-between mb-0.5">
                <div>
                  <span className="text-xs font-medium text-foreground">{book.title}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">by {book.author}</span>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">{book.read}/{book.pages}S</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", done ? "bg-emerald-500" : book.color)} style={{ width: `${pct * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
