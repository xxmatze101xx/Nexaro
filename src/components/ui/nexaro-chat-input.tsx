"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  ChevronDown,
  ArrowUp,
  X,
  FileText,
  Loader2,
  Check,
  Layers,
  BrainCircuit,
} from "lucide-react";

/* ─── TYPES ─── */

interface AttachedFile {
  id: string;
  file: File;
  type: string;
  preview: string | null;
  uploadStatus: "pending" | "uploading" | "complete";
  content?: string;
}

interface PastedSnippet {
  id: string;
  content: string;
  timestamp: Date;
}

export interface NexaroChatInputPayload {
  message: string;
  files: AttachedFile[];
  pastedContent: PastedSnippet[];
  model: string;
  deepAnalysis: boolean;
}

interface NexaroChatInputProps {
  onSendMessage: (data: NexaroChatInputPayload) => void;
  placeholder?: string;
  disabled?: boolean;
}

/* ─── UTILS ─── */

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/* ─── FILE PREVIEW CARD ─── */

interface FilePreviewCardProps {
  file: AttachedFile;
  onRemove: (id: string) => void;
}

const FilePreviewCard: React.FC<FilePreviewCardProps> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith("image/") && file.preview;

  return (
    <div className="relative group flex-shrink-0 w-[88px] h-[88px] rounded-[--radius] overflow-hidden border border-border bg-muted animate-fade-in transition-shadow hover:shadow-sm">
      {isImage ? (
        <img
          src={file.preview!}
          alt={file.file.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-primary/10 rounded-md">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {file.file.name.split(".").pop()}
            </span>
          </div>
          <div>
            <p
              className="text-[11px] font-medium text-foreground truncate"
              title={file.file.name}
            >
              {file.file.name}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatFileSize(file.file.size)}
            </p>
          </div>
        </div>
      )}

      {/* Remove */}
      <button
        onClick={() => onRemove(file.id)}
        className="absolute top-1 right-1 p-0.5 bg-foreground/70 hover:bg-foreground rounded-full text-background opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove file"
      >
        <X className="w-2.5 h-2.5" />
      </button>

      {/* Upload overlay */}
      {file.uploadStatus === "uploading" && (
        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        </div>
      )}
    </div>
  );
};

/* ─── PASTED SNIPPET CARD ─── */

interface PastedSnippetCardProps {
  snippet: PastedSnippet;
  onRemove: (id: string) => void;
}

const PastedSnippetCard: React.FC<PastedSnippetCardProps> = ({
  snippet,
  onRemove,
}) => {
  return (
    <div className="relative group flex-shrink-0 w-[96px] h-[88px] rounded-[--radius] overflow-hidden border border-border bg-card animate-fade-in p-2.5 flex flex-col justify-between shadow-sm">
      <p className="text-[9.5px] text-muted-foreground leading-[1.45] font-mono break-words whitespace-pre-wrap line-clamp-4 select-none">
        {snippet.content}
      </p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="inline-flex items-center px-1.5 py-[2px] rounded border border-border text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
          pasted
        </span>
      </div>
      <button
        onClick={() => onRemove(snippet.id)}
        className="absolute top-1.5 right-1.5 p-[3px] bg-card border border-border rounded-full text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Remove snippet"
      >
        <X className="w-2 h-2" />
      </button>
    </div>
  );
};

/* ─── MODEL SELECTOR ─── */

interface Model {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

interface ModelSelectorProps {
  models: Model[];
  selectedModel: string;
  onSelect: (id: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentModel = models.find((m) => m.id === selectedModel) ?? models[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-[--radius] text-xs font-medium transition-colors duration-150 ${
          isOpen
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <span className="whitespace-nowrap">{currentModel.name}</span>
        <ChevronDown
          className={`w-3 h-3 opacity-60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-card border border-border rounded-[--radius] shadow-lg overflow-hidden z-50 p-1 animate-fade-in">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onSelect(model.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-2.5 py-2 rounded-md flex items-start justify-between hover:bg-muted transition-colors"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-foreground">
                    {model.name}
                  </span>
                  {model.badge && (
                    <span className="px-1.5 py-[1px] rounded-full text-[10px] font-medium border border-primary/30 text-primary bg-primary/5">
                      {model.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {model.description}
                </span>
              </div>
              {selectedModel === model.id && (
                <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── MAIN COMPONENT ─── */

export const NexaroChatInput: React.FC<NexaroChatInputProps> = ({
  onSendMessage,
  placeholder = "Message Nexaro AI…",
  disabled = false,
}) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [pastedContent, setPastedContent] = useState<PastedSnippet[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState("nexaro-pro");
  const [deepAnalysis, setDeepAnalysis] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const models: Model[] = [
    {
      id: "nexaro-pro",
      name: "Nexaro Pro",
      description: "Best for complex tasks",
    },
    {
      id: "nexaro-fast",
      name: "Nexaro Fast",
      description: "Quick everyday answers",
    },
    {
      id: "nexaro-mini",
      name: "Nexaro Mini",
      description: "Lightweight & efficient",
      badge: "Beta",
    },
  ];

  /* Auto-resize textarea */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 320) + "px";
    }
  }, [message]);

  /* File handling */
  const handleFiles = useCallback((list: FileList | File[]) => {
    const newFiles: AttachedFile[] = Array.from(list).map((file) => {
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
      return {
        id: Math.random().toString(36).slice(2, 10),
        file,
        type: isImage ? file.type || "image/unknown" : file.type || "application/octet-stream",
        preview: isImage ? URL.createObjectURL(file) : null,
        uploadStatus: "pending",
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach((f) => {
      setTimeout(
        () =>
          setFiles((prev) =>
            prev.map((p) =>
              p.id === f.id ? { ...p, uploadStatus: "complete" } : p
            )
          ),
        600 + Math.random() * 800
      );
    });
  }, []);

  /* Drag & drop */
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  /* Paste handling */
  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedFiles: File[] = [];
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) pastedFiles.push(f);
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      handleFiles(pastedFiles);
      return;
    }

    const text = e.clipboardData.getData("text");
    if (text.length > 300) {
      e.preventDefault();
      setPastedContent((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 10),
          content: text,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleSend = () => {
    if (!message.trim() && files.length === 0 && pastedContent.length === 0) return;
    onSendMessage({ message, files, pastedContent, model: selectedModel, deepAnalysis });
    setMessage("");
    setFiles([]);
    setPastedContent([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent =
    message.trim().length > 0 || files.length > 0 || pastedContent.length > 0;
  const charCount = message.length;

  return (
    <div
      className="relative w-full max-w-2xl mx-auto"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Main container */}
      <div
        className={`flex flex-col rounded-[--radius] border bg-card transition-shadow duration-200 ${
          isDragging
            ? "border-primary shadow-[0_0_0_2px_var(--primary)] shadow-primary/20"
            : "border-border shadow-sm hover:shadow-md focus-within:border-primary/50 focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--primary)_15%,transparent)]"
        }`}
      >
        <div className="px-3 pt-3 pb-2 flex flex-col gap-2">

          {/* Attachments row */}
          {(files.length > 0 || pastedContent.length > 0) && (
            <div className="flex gap-2.5 overflow-x-auto nexaro-scrollbar pb-1">
              {pastedContent.map((s) => (
                <PastedSnippetCard
                  key={s.id}
                  snippet={s}
                  onRemove={(id) =>
                    setPastedContent((prev) => prev.filter((c) => c.id !== id))
                  }
                />
              ))}
              {files.map((f) => (
                <FilePreviewCard
                  key={f.id}
                  file={f}
                  onRemove={(id) =>
                    setFiles((prev) => prev.filter((p) => p.id !== id))
                  }
                />
              ))}
            </div>
          )}

          {/* Textarea */}
          <div className="max-h-80 overflow-y-auto nexaro-scrollbar">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              autoFocus
              className="w-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground resize-none overflow-hidden leading-relaxed py-0 px-1 block font-[inherit] disabled:opacity-50"
              style={{ minHeight: "1.5em" }}
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1.5">

            {/* Left tools */}
            <div className="flex items-center gap-1 flex-1">
              {/* Attach */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                aria-label="Attach file"
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Deep analysis toggle */}
              <button
                type="button"
                onClick={() => setDeepAnalysis((v) => !v)}
                disabled={disabled}
                aria-pressed={deepAnalysis}
                aria-label="Toggle deep analysis"
                className={`h-7 flex items-center gap-1.5 px-2 rounded-md text-xs font-medium transition-colors disabled:opacity-40 ${
                  deepAnalysis
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deep analysis</span>
              </button>
            </div>

            {/* Right tools */}
            <div className="flex items-center gap-1.5">
              {/* Character count — visible when typing */}
              {charCount > 200 && (
                <span
                  className={`text-[10px] tabular-nums transition-colors ${
                    charCount > 4000
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {charCount.toLocaleString()}
                </span>
              )}

              {/* Model selector */}
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onSelect={setSelectedModel}
              />

              {/* Stacked-pages icon to show model context, for visual distinction */}
              <div className="w-px h-4 bg-border" />

              {/* Send */}
              <button
                type="button"
                onClick={handleSend}
                disabled={!hasContent || disabled}
                aria-label="Send message"
                className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                  hasContent && !disabled
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                    : "bg-primary/20 text-primary/40 cursor-default"
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-background/80 border-2 border-dashed border-primary rounded-[--radius] z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <Layers className="w-8 h-8 text-primary mb-2" />
          <p className="text-sm font-medium text-primary">Drop to attach</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Footer hint */}
      <p className="text-center text-[11px] text-muted-foreground mt-3 opacity-70">
        Press <kbd className="font-sans px-1 py-0.5 rounded border border-border text-[10px]">Enter</kbd> to send
        · <kbd className="font-sans px-1 py-0.5 rounded border border-border text-[10px]">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
};

export default NexaroChatInput;
