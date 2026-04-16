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
  Cloud,
} from "lucide-react";
import type { PreviewFile } from "@/components/files-preview";

interface OneDriveItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  webUrl?: string;
  folder?: { childCount?: number };
  file?: { mimeType?: string };
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

function getOneDriveIcon(item: OneDriveItem) {
  if (item.folder) return <Folder className="w-4 h-4 text-blue-500" />;
  const mime = item.file?.mimeType ?? "";
  if (mime.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-blue-400" />;
  if (mime === "application/pdf" || mime.includes("document") || mime.includes("word"))
    return <FileText className="w-4 h-4 text-blue-600" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FilesOneDriveProps {
  userId: string;
  onSelect: (file: PreviewFile) => void;
  selectedFile: PreviewFile | null;
  searchQuery?: string;
  sort?: { by: string; dir: string };
}

export function FilesOneDrive({ userId, onSelect, selectedFile, searchQuery: _searchQuery, sort: _sort }: FilesOneDriveProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [items, setItems] = useState<OneDriveItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: "root", name: "My Files" }]);

  const currentItemId = breadcrumb[breadcrumb.length - 1]?.id ?? "root";

  // Check if Microsoft (OneDrive) is connected
  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, "users", userId, "tokens", "microsoft"))
      .then((snap) => setIsConnected(snap.exists()))
      .catch(() => setIsConnected(false));
  }, [userId]);

  const fetchItems = useCallback(async (itemId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/onedrive?uid=${userId}&itemId=${itemId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = (await res.json()) as { items?: OneDriveItem[]; error?: string };
      if (data.items) setItems(data.items);
      else console.warn("[files-onedrive]", data.error);
    } catch (err: unknown) {
      console.warn("[files-onedrive] fetch error:", err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [user, userId]);

  useEffect(() => {
    if (isConnected) {
      fetchItems(currentItemId);
    }
  }, [isConnected, currentItemId, fetchItems]);

  const handleConnect = async () => {
    if (!user) return;
    const idToken = await user.getIdToken();
    window.location.href = `/api/microsoft/connect?uid=${userId}&idToken=${idToken}`;
  };

  const handleItemClick = (item: OneDriveItem) => {
    if (item.folder) {
      setBreadcrumb((prev) => [...prev, { id: item.id, name: item.name }]);
    } else {
      onSelect({
        name: item.name,
        mimeType: item.file?.mimeType ?? "",
        webUrl: item.webUrl,
        source: "onedrive",
      });
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
        <Cloud className="w-12 h-12 opacity-20" />
        <p className="text-sm font-medium">OneDrive not connected</p>
        <p className="text-xs opacity-60 text-center max-w-xs">
          Connect your Microsoft account to browse OneDrive files directly from Nexaro.
        </p>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Connect OneDrive
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
          onClick={() => fetchItems(currentItemId)}
          className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Folder className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">This folder is empty</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((item) => {
              const isSelected = selectedFile?.webUrl === item.webUrl && !item.folder;
              return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left border-l-2",
                  isSelected
                    ? "bg-indigo-50 border-indigo-500 dark:bg-indigo-950/40 dark:border-indigo-400"
                    : "hover:bg-muted/40 border-transparent"
                )}
              >
                <div className="shrink-0">{getOneDriveIcon(item)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {item.lastModifiedDateTime && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.lastModifiedDateTime).toLocaleDateString()}
                      </span>
                    )}
                    {item.size && (
                      <span className="text-xs text-muted-foreground">{formatBytes(item.size)}</span>
                    )}
                    {item.folder && item.folder.childCount !== undefined && (
                      <span className="text-xs text-muted-foreground">{item.folder.childCount} items</span>
                    )}
                  </div>
                </div>
                {item.folder && (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
