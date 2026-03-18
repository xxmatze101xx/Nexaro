"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  ref,
  listAll,
  getDownloadURL,
  getMetadata,
  uploadBytesResumable,
  deleteObject,
} from "firebase/storage";
import { storage } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import {
  Upload,
  Trash2,
  Download,
  File,
  FileText,
  FileCode,
  FileJson,
  Image as ImageIcon,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import type { PreviewFile } from "@/components/files-preview";

interface UploadedFile {
  name: string;
  fullPath: string;
  downloadUrl: string;
  size: number;
  contentType: string;
  timeCreated: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ contentType, name }: { contentType: string; name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (contentType.startsWith("image/")) return <ImageIcon className="w-6 h-6 text-blue-500" />;
  if (contentType === "application/pdf" || ext === "pdf") return <FileText className="w-6 h-6 text-red-500" />;
  if (contentType === "application/json" || ext === "json") return <FileJson className="w-6 h-6 text-yellow-500" />;
  if (
    contentType.startsWith("text/") ||
    ["md", "txt", "csv", "xml", "html", "yaml", "yml", "toml", "log"].includes(ext)
  ) return <FileText className="w-6 h-6 text-green-500" />;
  if (
    contentType.includes("javascript") ||
    contentType.includes("typescript") ||
    ["js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "java", "cs", "cpp", "c", "sh", "css", "scss"].includes(ext)
  ) return <FileCode className="w-6 h-6 text-purple-500" />;
  return <File className="w-6 h-6 text-muted-foreground" />;
}

interface FilesUploadsProps {
  userId: string;
  onSelect: (file: PreviewFile) => void;
  selectedFile: PreviewFile | null;
}

export function FilesUploads({ userId, onSelect, selectedFile }: FilesUploadsProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const listRef = ref(storage, `users/${userId}/uploads`);
      const result = await listAll(listRef);
      const items = await Promise.all(
        result.items.map(async (itemRef) => {
          const [url, meta] = await Promise.all([
            getDownloadURL(itemRef),
            getMetadata(itemRef),
          ]);
          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            downloadUrl: url,
            size: meta.size,
            contentType: meta.contentType ?? "",
            timeCreated: meta.timeCreated,
          };
        })
      );
      items.sort((a, b) => new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime());
      setFiles(items);
    } catch (err: unknown) {
      console.warn("[files-uploads] load error:", err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const storageRef = ref(storage, `users/${userId}/uploads/${file.name}`);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snap) => {
        setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      (err) => {
        console.error("[files-uploads] upload error:", err.message);
        setUploadProgress(null);
      },
      () => {
        setUploadProgress(null);
        loadFiles();
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    );
  };

  const handleDelete = async (fullPath: string) => {
    setDeletingPath(fullPath);
    try {
      await deleteObject(ref(storage, fullPath));
      setFiles((prev) => prev.filter((f) => f.fullPath !== fullPath));
    } catch (err: unknown) {
      console.error("[files-uploads] delete error:", err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingPath(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Upload bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadProgress !== null}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold transition-all hover:bg-primary/90 active:scale-95 shadow-sm",
            uploadProgress !== null && "opacity-60 cursor-not-allowed"
          )}
        >
          <Upload className="w-4 h-4" />
          Upload File
        </button>

        {uploadProgress !== null && (
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{uploadProgress}%</span>
          </div>
        )}
      </div>

      {/* File grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading files...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <FolderOpen className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">No uploads yet</p>
            <p className="text-xs opacity-60">Upload files to store them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {files.map((file) => {
              const isSelected = selectedFile?.url === file.downloadUrl;
              return (
              <div
                key={file.fullPath}
                onClick={() => onSelect({ name: file.name, mimeType: file.contentType, url: file.downloadUrl, source: "upload" })}
                className={cn(
                  "group relative flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-400 dark:ring-indigo-800"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                {/* Preview / icon */}
                {file.contentType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.downloadUrl}
                    alt={file.name}
                    className="w-12 h-12 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                    <FileTypeIcon contentType={file.contentType} name={file.name} />
                  </div>
                )}

                <p className="text-xs text-foreground font-medium text-center truncate w-full" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>

                {/* Actions — appear on hover */}
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded bg-background border border-border text-muted-foreground hover:text-foreground"
                    title="Download"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(file.fullPath); }}
                    disabled={deletingPath === file.fullPath}
                    className="p-1 rounded bg-background border border-border text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    {deletingPath === file.fullPath ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
