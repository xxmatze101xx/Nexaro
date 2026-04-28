"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  Trash2,
  Download,
  File,
  FileText,
  FileCode,
  FileJson,
  Image as ImageIcon,
  RefreshCw,
  FolderOpen,
  CheckSquare,
  Square,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import type { PreviewFile } from "@/components/files-preview";
import type { SortBy, SortDir } from "@/components/files-panel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/useToast";

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
  searchQuery?: string;
  sort?: { by: SortBy; dir: SortDir };
}

export function FilesUploads({ userId, onSelect, selectedFile, searchQuery = "", sort }: FilesUploadsProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const loadFiles = useCallback(async () => {
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
      setFiles(items);
    } catch (err: unknown) {
      console.warn("[files-uploads] load error:", err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const processUpload = useCallback((file: File) => {
    if (!userId) return;
    const storageRef = ref(storage, `users/${userId}/uploads/${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { console.error("[files-uploads] upload error:", err.message); setUploadProgress(null); },
      () => { setUploadProgress(null); loadFiles(); }
    );
  }, [userId, loadFiles]);

  const handleFileDrop = useCallback((newFiles: File[]) => {
    newFiles.forEach(processUpload);
  }, [processUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    onDrop: handleFileDrop,
  });

  const handleDelete = async (fullPath: string) => {
    setDeletingPath(fullPath);
    try {
      await deleteObject(ref(storage, fullPath));
      setFiles(prev => prev.filter(f => f.fullPath !== fullPath));
      setSelectedPaths(prev => { const next = new Set(prev); next.delete(fullPath); return next; });
    } catch (err: unknown) {
      console.error("[files-uploads] delete error:", err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingPath(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedPaths.size) return;
    setIsBulkDeleting(true);
    const paths = Array.from(selectedPaths);
    const results = await Promise.allSettled(paths.map(p => deleteObject(ref(storage, p))));
    const ok = results.filter(r => r.status === "fulfilled").length;
    setFiles(prev => prev.filter(f => !selectedPaths.has(f.fullPath)));
    setSelectedPaths(new Set());
    setIsBulkDeleting(false);
    showToast(t("files.deleteSummary", { ok: String(ok), total: String(paths.length) }), ok === paths.length ? "success" : "error");
  };

  const toggleSelect = (fullPath: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(fullPath)) next.delete(fullPath); else next.add(fullPath);
      return next;
    });
  };

  const filteredSorted = useMemo(() => {
    let list = [...files];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sort?.by === "name") cmp = a.name.localeCompare(b.name);
      else if (sort?.by === "size") cmp = a.size - b.size;
      else cmp = new Date(a.timeCreated).getTime() - new Date(b.timeCreated).getTime();
      return sort?.dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [files, searchQuery, sort]);

  const allSelected = filteredSorted.length > 0 && filteredSorted.every(f => selectedPaths.has(f.fullPath));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(filteredSorted.map(f => f.fullPath)));
    }
  };

  return (
    <div className="flex flex-col h-full" {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Body-wide drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-primary border-dashed rounded-lg pointer-events-none">
          <p className="text-primary font-semibold text-sm">{t("files.dropToUpload")}</p>
        </div>
      )}

      {/* Upload area + multi-select toolbar */}
      <div className="px-4 pt-4 pb-2 border-b border-border/50 shrink-0 space-y-2">
        <div
          onClick={() => (document.getElementById("file-upload-direct") as HTMLInputElement | null)?.click()}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer border border-dashed transition-colors",
            "border-border/60 hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <input
            id="file-upload-direct"
            type="file"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) handleFileDrop(Array.from(e.target.files)); }}
          />
          <span className="text-sm text-muted-foreground">{t("files.uploading").replace("…", "")} / {t("files.dropToUpload").toLowerCase()}</span>
        </div>
        {uploadProgress !== null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{uploadProgress}%</span>
          </div>
        )}

        {/* Multi-select toolbar */}
        {filteredSorted.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
              {t("files.selectAll")}
            </button>
            {selectedPaths.size > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {t("files.selected", { count: String(selectedPaths.size) })}
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors ml-auto disabled:opacity-50"
                >
                  {isBulkDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  {t("files.deleteSelected")}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* File grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-28 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <FolderOpen className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">
              {searchQuery.trim() ? t("files.empty.noResults") : t("files.empty.uploads")}
            </p>
            {!searchQuery.trim() && <p className="text-xs opacity-60">{t("files.empty.uploadsHint")}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredSorted.map((file) => {
              const isSelected = selectedFile?.url === file.downloadUrl;
              const isChecked = selectedPaths.has(file.fullPath);
              return (
                <div
                  key={file.fullPath}
                  onClick={() => onSelect({ name: file.name, mimeType: file.contentType, url: file.downloadUrl, source: "upload" })}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-400 dark:ring-indigo-800"
                      : isChecked
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(file.fullPath); }}
                    className="absolute top-1.5 left-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isChecked
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>

                  {/* Preview / icon */}
                  {file.contentType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.downloadUrl} alt={file.name} className="w-12 h-12 object-cover rounded-md" />
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
                      title={t("files.preview.download")}
                    >
                      <Download className="w-3 h-3" />
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.fullPath); }}
                      disabled={deletingPath === file.fullPath}
                      className="p-1 rounded bg-background border border-border text-muted-foreground hover:text-destructive"
                      title={t("common.delete")}
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
