"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import {
  FileText,
  Image as ImageIcon,
  File,
  RefreshCw,
  Paperclip,
} from "lucide-react";
import type { PreviewFile } from "@/components/files-preview";

interface Attachment {
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  source: string;
  sender: string;
  date: string;
}

interface MessageDoc {
  attachments?: Attachment[];
  source?: string;
  sender?: string;
  timestamp?: string;
}

type FilterType = "all" | "pdf" | "images" | "docs" | "other";

interface FilesAttachmentsProps {
  userId: string;
  onSelect: (file: PreviewFile) => void;
  selectedFile: PreviewFile | null;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (mimeType.includes("word") || mimeType.includes("document") || mimeType.startsWith("text/"))
    return <FileText className="w-4 h-4 text-blue-600" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

function matchesFilter(att: Attachment, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (filter === "pdf") return att.mimeType === "application/pdf";
  if (filter === "images") return att.mimeType.startsWith("image/");
  if (filter === "docs")
    return (
      att.mimeType.includes("word") ||
      att.mimeType.includes("document") ||
      att.mimeType.includes("spreadsheet") ||
      att.mimeType.includes("presentation") ||
      att.mimeType.startsWith("text/")
    );
  if (filter === "other")
    return (
      !att.mimeType.startsWith("image/") &&
      att.mimeType !== "application/pdf" &&
      !att.mimeType.includes("word") &&
      !att.mimeType.includes("document") &&
      !att.mimeType.includes("spreadsheet") &&
      !att.mimeType.includes("presentation") &&
      !att.mimeType.startsWith("text/")
    );
  return true;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SOURCE_COLORS: Record<string, string> = {
  gmail: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  slack: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  teams: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  outlook: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
};

export function FilesAttachments({ userId, onSelect, selectedFile }: FilesAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);

    const q = query(
      collection(db, "messages"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );

    getDocs(q)
      .then((snap) => {
        const all: Attachment[] = [];
        snap.docs.forEach((doc) => {
          const data = doc.data() as MessageDoc;
          if (data.attachments && data.attachments.length > 0) {
            data.attachments.forEach((att) => {
              all.push({
                ...att,
                source: data.source ?? "unknown",
                sender: data.sender ?? "",
                date: data.timestamp ?? "",
              });
            });
          }
        });
        setAttachments(all);
      })
      .catch((err: unknown) => {
        console.warn("[files-attachments] fetch error:", err instanceof Error ? err.message : String(err));
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  const filtered = attachments.filter((a) => matchesFilter(a, filter));

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pdf", label: "PDF" },
    { id: "images", label: "Images" },
    { id: "docs", label: "Docs" },
    { id: "other", label: "Other" },
  ];

  const handleClick = (att: Attachment) => {
    onSelect({
      name: att.filename,
      mimeType: att.mimeType,
      url: att.url,
      source: "attachment",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter chips */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading attachments...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Paperclip className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">No attachments found</p>
            <p className="text-xs opacity-60">Attachments from your emails and messages appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((att, i) => {
              const isSelected = selectedFile?.name === att.filename && selectedFile?.url === att.url;
              return (
                <button
                  key={i}
                  onClick={() => handleClick(att)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
                    isSelected
                      ? "bg-primary/10 border-l-2 border-primary"
                      : "hover:bg-muted/40 border-l-2 border-transparent"
                  )}
                >
                  <div className="shrink-0">{getFileIcon(att.mimeType)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{att.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {att.source && (
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", SOURCE_COLORS[att.source] ?? "bg-muted text-muted-foreground")}>
                          {att.source}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground truncate">{att.sender}</span>
                      {att.date && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(att.date).toLocaleDateString()}
                        </span>
                      )}
                      {att.size > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0">{formatBytes(att.size)}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
