"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Download,
  ExternalLink,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";

export interface PreviewFile {
  name: string;
  mimeType: string;
  /** Direct URL — used for images, PDFs, and Firebase Storage uploads */
  url?: string;
  /** Google Drive file ID — used to build the Drive embed URL */
  driveId?: string;
  /** OneDrive web URL — used for Office Online viewer */
  webUrl?: string;
  source: "attachment" | "drive" | "onedrive" | "upload";
}

interface FilesPreviewProps {
  file: PreviewFile;
  onClose: () => void;
  className?: string;
}

// ─── File type detection ──────────────────────────────────────────────────────

const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/xml",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
]);

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "csv", "json", "xml", "html", "htm",
  "js", "jsx", "ts", "tsx", "css", "scss", "less",
  "py", "rb", "sh", "bash", "zsh",
  "yaml", "yml", "toml", "ini", "env", "cfg", "conf",
  "log", "sql", "graphql", "gql",
  "gitignore", "dockerignore", "editorconfig",
  "rs", "go", "java", "c", "cpp", "h", "cs", "php", "swift", "kt",
]);

function ext(file: PreviewFile): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function isTextFile(file: PreviewFile): boolean {
  if (!file.url) return false;
  const mime = file.mimeType.split(";")[0].trim();
  return TEXT_MIMES.has(mime) || mime.startsWith("text/") || TEXT_EXTENSIONS.has(ext(file));
}

function isMarkdownFile(file: PreviewFile): boolean {
  const mime = file.mimeType.split(";")[0].trim();
  const e = ext(file);
  return mime === "text/markdown" || e === "md" || e === "markdown";
}

function isJsonFile(file: PreviewFile): boolean {
  const mime = file.mimeType.split(";")[0].trim();
  return mime === "application/json" || ext(file) === "json";
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Apply inline formatting: bold, italic, code, links, strikethrough */
function applyInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-[0.85em] font-mono">$1</code>')
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="inline max-w-full rounded" />'
    )
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80">$1</a>'
    );
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // Fenced code block
    if (raw.startsWith("```") || raw.startsWith("~~~")) {
      const fence = raw.startsWith("```") ? "```" : "~~~";
      const lang = escapeHtml(raw.slice(fence.length).trim());
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      const langBadge = lang ? `<span class="text-[10px] text-muted-foreground font-mono mb-1 block">${lang}</span>` : "";
      out.push(
        `<pre class="bg-muted/60 border border-border rounded-md p-4 my-4 overflow-x-auto">${langBadge}<code class="text-[0.85em] font-mono leading-relaxed">${codeLines.join("\n")}</code></pre>`
      );
      i++; // skip closing fence
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const content = applyInline(escapeHtml(hMatch[2]));
      const styles: Record<number, string> = {
        1: "text-2xl font-bold mt-8 mb-3 pb-2 border-b border-border",
        2: "text-xl font-bold mt-6 mb-2 pb-1 border-b border-border",
        3: "text-lg font-semibold mt-5 mb-2",
        4: "text-base font-semibold mt-4 mb-1",
        5: "text-sm font-semibold mt-3 mb-1",
        6: "text-sm font-medium mt-3 mb-1 text-muted-foreground",
      };
      out.push(`<h${level} class="${styles[level] ?? ""}">${content}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      out.push('<hr class="border-border my-6" />');
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i].startsWith(">"))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(
        `<blockquote class="border-l-4 border-primary/50 pl-4 py-1 my-3 text-muted-foreground italic">${applyInline(escapeHtml(quoteLines.join(" ")))}</blockquote>`
      );
      continue;
    }

    // Unordered list
    if (/^[*\-+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[*\-+] /.test(lines[i].trim())) {
        items.push(`<li class="ml-5 list-disc my-0.5">${applyInline(escapeHtml(lines[i].trim().slice(2)))}</li>`);
        i++;
      }
      out.push(`<ul class="my-3">${items.join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        items.push(`<li class="ml-5 list-decimal my-0.5">${applyInline(escapeHtml(lines[i].trim().replace(/^\d+[.)]\s/, "")))}</li>`);
        i++;
      }
      out.push(`<ol class="my-3">${items.join("")}</ol>`);
      continue;
    }

    // Task list (GitHub style)
    if (/^\[[ xX]\] /.test(line)) {
      const checked = line[1].toLowerCase() === "x";
      const text = applyInline(escapeHtml(line.slice(4)));
      out.push(
        `<p class="flex items-start gap-2 my-1"><input type="checkbox" ${checked ? "checked" : ""} disabled class="mt-1 shrink-0" /><span>${text}</span></p>`
      );
      i++;
      continue;
    }

    // Table (basic — detects pipe-separated rows)
    if (line.includes("|") && i + 1 < lines.length && /^\|?[-: |]+\|?$/.test(lines[i + 1].trim())) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().includes("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].replace(/^\||\|$/g, "").split("|").map(c => c.trim());
        const bodyRows = tableLines.slice(2); // skip separator row
        const header = `<thead><tr>${headerCells.map(c => `<th class="px-3 py-2 text-left font-semibold border border-border bg-muted/50">${applyInline(escapeHtml(c))}</th>`).join("")}</tr></thead>`;
        const body = bodyRows
          .map(row => {
            const cells = row.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
            return `<tr>${cells.map(c => `<td class="px-3 py-1.5 border border-border">${applyInline(escapeHtml(c))}</td>`).join("")}</tr>`;
          })
          .join("");
        out.push(`<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse text-sm">${header}<tbody>${body}</tbody></table></div>`);
      }
      continue;
    }

    // Empty line
    if (line === "") {
      i++;
      continue;
    }

    // Regular paragraph — collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("~~~") &&
      !lines[i].startsWith("> ") &&
      !/^[*\-+] /.test(lines[i].trim()) &&
      !/^\d+[.)]\s/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      out.push(`<p class="my-3 leading-relaxed">${applyInline(escapeHtml(paraLines.join("<br />")))}</p>`);
    } else {
      // Safety: no handler matched this line — advance to prevent infinite loop
      i++;
    }
  }

  return out.join("\n");
}

// ─── Text viewer component ────────────────────────────────────────────────────

function TextViewer({ file }: { file: PreviewFile }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file.url) {
      setError("No URL available to fetch content.");
      return;
    }

    let cancelled = false;
    setContent(null);
    setError(null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const proxyUrl = `/api/files/text?url=${encodeURIComponent(file.url)}`;
    fetch(proxyUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        if (isJsonFile(file)) {
          try { setContent(JSON.stringify(JSON.parse(text), null, 2)); }
          catch { setContent(text); }
        } else {
          setContent(text);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") {
          setError("Timeout — Datei nicht erreichbar.");
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [file.url]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderedMarkdown = useMemo(
    () => (content !== null && isMarkdownFile(file) ? renderMarkdown(content) : null),
    [content] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
        <AlertCircle className="w-8 h-8 opacity-40" />
        <p className="text-sm font-medium">Could not load file</p>
        <p className="text-xs opacity-60">{error}</p>
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  // Markdown — render as HTML
  if (renderedMarkdown !== null) {
    return (
      <div className="h-full overflow-y-auto">
        <div
          className="px-8 py-6 text-sm text-foreground max-w-3xl"
          dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
        />
      </div>
    );
  }

  // Everything else — monospace pre block
  return (
    <div className="h-full overflow-auto">
      <pre className="px-6 py-5 text-xs font-mono leading-relaxed text-foreground whitespace-pre-wrap break-words">
        {content}
      </pre>
    </div>
  );
}

// ─── Embed URL resolution ─────────────────────────────────────────────────────

function getEmbedUrl(file: PreviewFile): string | null {
  // Google Drive: embed using the standard Drive preview URL
  if (file.source === "drive" && file.driveId) {
    return `https://drive.google.com/file/d/${file.driveId}/preview`;
  }

  // OneDrive Office files (Word, Excel, PowerPoint)
  if (
    file.source === "onedrive" &&
    file.webUrl &&
    (file.mimeType.includes("word") ||
      file.mimeType.includes("excel") ||
      file.mimeType.includes("spreadsheet") ||
      file.mimeType.includes("presentation") ||
      file.mimeType.includes("powerpoint") ||
      file.name.endsWith(".docx") ||
      file.name.endsWith(".doc") ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.name.endsWith(".pptx") ||
      file.name.endsWith(".ppt"))
  ) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.webUrl)}`;
  }

  // PDF via direct URL (uploads, attachments)
  if (file.mimeType === "application/pdf" && file.url) {
    return file.url;
  }

  // Google Docs/Sheets/Slides viewer via direct URL
  if (
    file.source !== "drive" &&
    (file.mimeType.includes("word") ||
      file.mimeType.includes("document") ||
      file.mimeType.includes("spreadsheet") ||
      file.mimeType.includes("presentation")) &&
    file.url
  ) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;
  }

  return null;
}

function isImage(file: PreviewFile): boolean {
  return file.mimeType.startsWith("image/");
}

function getDownloadUrl(file: PreviewFile): string | null {
  if (file.url) return file.url;
  if (file.source === "drive" && file.driveId)
    return `https://drive.google.com/uc?export=download&id=${file.driveId}`;
  if (file.source === "onedrive" && file.webUrl) return file.webUrl;
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FilesPreview({ file, onClose, className }: FilesPreviewProps) {
  const isImg = isImage(file);
  const isText = isTextFile(file);
  const embedUrl = !isText ? getEmbedUrl(file) : null;
  const downloadUrl = getDownloadUrl(file);
  const openUrl =
    file.url ??
    file.webUrl ??
    (file.driveId ? `https://drive.google.com/file/d/${file.driveId}/view` : null);

  return (
    <div className={cn("flex flex-col h-full border-l border-border bg-background", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{file.mimeType || "Unknown type"}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview body */}
      <div className="flex-1 overflow-hidden">
        {isImg && file.url ? (
          // Image preview
          <div className="w-full h-full flex items-center justify-center p-6 bg-muted/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-md shadow-sm"
            />
          </div>
        ) : isText ? (
          // Text / Markdown viewer
          <TextViewer file={file} />
        ) : embedUrl ? (
          // Iframe embed (PDF, Drive, Office Online)
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title={file.name}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          // Fallback: no preview available
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
            {file.mimeType.startsWith("image/") ? (
              <ImageIcon className="w-12 h-12 opacity-20" />
            ) : file.mimeType.includes("pdf") || file.mimeType.includes("document") ? (
              <FileText className="w-12 h-12 opacity-20" />
            ) : (
              <File className="w-12 h-12 opacity-20" />
            )}
            <p className="text-sm font-medium">Preview not available</p>
            <p className="text-xs opacity-60 text-center max-w-xs">
              This file type cannot be previewed inline.
            </p>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download File
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
