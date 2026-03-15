"use client";

import React, { useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Folder,
  FileText,
  Image as ImageIcon,
  File,
  ChevronRight,
  RefreshCw,
  HardDrive,
  ExternalLink,
} from "lucide-react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

function getDriveIcon(mimeType: string) {
  if (mimeType === "application/vnd.google-apps.folder")
    return <Folder className="w-4 h-4 text-amber-500" />;
  if (mimeType.startsWith("image/"))
    return <ImageIcon className="w-4 h-4 text-blue-500" />;
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("presentation") ||
    mimeType.includes("spreadsheet")
  )
    return <FileText className="w-4 h-4 text-blue-600" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

function formatBytes(sizeStr: string | undefined): string {
  const bytes = Number(sizeStr ?? 0);
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesDrive({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: "root", name: "My Drive" }]);

  const currentFolderId = breadcrumb[breadcrumb.length - 1]?.id ?? "root";

  // Check if Drive is connected
  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, "users", userId, "tokens", "google_drive"))
      .then((snap) => setIsConnected(snap.exists()))
      .catch(() => setIsConnected(false));
  }, [userId]);

  const fetchFiles = useCallback(async (folderId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/drive?uid=${userId}&folderId=${folderId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = (await res.json()) as { files?: DriveFile[]; error?: string };
      if (data.files) setFiles(data.files);
      else console.warn("[files-drive]", data.error);
    } catch (err: unknown) {
      console.warn("[files-drive] fetch error:", err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [user, userId]);

  useEffect(() => {
    if (isConnected) {
      fetchFiles(currentFolderId);
    }
  }, [isConnected, currentFolderId, fetchFiles]);

  const handleConnect = async () => {
    if (!user) return;
    const idToken = await user.getIdToken();
    window.location.href = `/api/drive/auth?uid=${userId}&idToken=${idToken}`;
  };

  const handleItemClick = (file: DriveFile) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      setBreadcrumb((prev) => [...prev, { id: file.id, name: file.name }]);
    } else if (file.webViewLink) {
      window.open(file.webViewLink, "_blank");
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumb((prev) => prev.slice(0, index + 1));
  };

  if (isConnected === null) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking connection...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <HardDrive className="w-12 h-12 opacity-20" />
        <p className="text-sm font-medium">Google Drive not connected</p>
        <p className="text-xs opacity-60 text-center max-w-xs">
          Connect your Google Drive to browse and access your files directly from Nexaro.
        </p>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Connect Google Drive
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50 shrink-0 flex-wrap">
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={crumb.id}>
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <button
              onClick={() => handleBreadcrumbClick(i)}
              className={cn(
                "text-sm transition-colors",
                i === breadcrumb.length - 1
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
        <button
          onClick={() => fetchFiles(currentFolderId)}
          className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Folder className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">This folder is empty</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {files.map((file) => (
              <button
                key={file.id}
                onClick={() => handleItemClick(file)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left group"
              >
                <div className="shrink-0">{getDriveIcon(file.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{file.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {file.modifiedTime && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(file.modifiedTime).toLocaleDateString()}
                      </span>
                    )}
                    {file.size && (
                      <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                    )}
                  </div>
                </div>
                {file.mimeType !== "application/vnd.google-apps.folder" && file.webViewLink && (
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
                {file.mimeType === "application/vnd.google-apps.folder" && (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
