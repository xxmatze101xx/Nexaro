"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Download,
  ExternalLink,
  File,
  FileText,
  Image as ImageIcon,
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

export function FilesPreview({ file, onClose, className }: FilesPreviewProps) {
  const embedUrl = getEmbedUrl(file);
  const isImg = isImage(file);
  const downloadUrl = getDownloadUrl(file);
  const openUrl = file.url ?? file.webUrl ?? (file.driveId ? `https://drive.google.com/file/d/${file.driveId}/view` : null);

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
