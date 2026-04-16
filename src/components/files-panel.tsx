"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { FilesAttachments } from "@/components/files-attachments";
import { FilesDrive } from "@/components/files-drive";
import { FilesOneDrive } from "@/components/files-onedrive";
import { FilesUploads } from "@/components/files-uploads";
import { FilesPreview, type PreviewFile } from "@/components/files-preview";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, ArrowUpDown } from "lucide-react";

type Tab = "attachments" | "drive" | "onedrive" | "uploads";
export type SortBy = "name" | "date" | "size";
export type SortDir = "asc" | "desc";

interface FilesPanelProps {
  userId: string;
  className?: string;
}

export function FilesPanel({ userId, className }: FilesPanelProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("attachments");
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPreviewFile(null);
    setSearchQuery("");
  };

  const cycleSortDir = () => setSortDir(d => d === "asc" ? "desc" : "asc");

  const tabs: { id: Tab; label: string }[] = [
    { id: "attachments", label: t("files.tabs.attachments") },
    { id: "drive", label: t("files.tabs.drive") },
    { id: "onedrive", label: t("files.tabs.onedrive") },
    { id: "uploads", label: t("files.tabs.uploads") },
  ];

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: "name", label: t("files.sortName") },
    { value: "date", label: t("files.sortDate") },
    { value: "size", label: t("files.sortSize") },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Tab bar */}
      <div className="flex items-center border-b border-border shrink-0 px-4 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label}
          </button>
        ))}

        {/* Search + Sort */}
        <div className="ml-auto flex items-center gap-2 py-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("files.search")}
              className="pl-8 pr-3 py-1.5 text-xs bg-muted/60 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 w-40 transition-all focus:w-52"
            />
          </div>
          <div className="flex items-center gap-1">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="text-xs bg-muted/60 border border-border/50 rounded-lg px-2 py-1.5 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer"
            >
              {sortOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={cycleSortDir}
              className="p-1.5 rounded-lg bg-muted/60 border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
              title={sortDir === "asc" ? t("files.asc") : t("files.desc")}
            >
              <ArrowUpDown className="w-3.5 h-3.5" style={{ transform: sortDir === "desc" ? "scaleY(-1)" : "none" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Split: file list + preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* File list — shrinks to fixed width when preview is open */}
        <div className={cn("flex flex-col overflow-hidden transition-all", previewFile ? "w-[380px] shrink-0 border-r border-border" : "flex-1")}>
          {activeTab === "attachments" && (
            <FilesAttachments userId={userId} onSelect={setPreviewFile} selectedFile={previewFile} searchQuery={searchQuery} sort={{ by: sortBy, dir: sortDir }} />
          )}
          {activeTab === "drive" && (
            <FilesDrive userId={userId} onSelect={setPreviewFile} selectedFile={previewFile} searchQuery={searchQuery} sort={{ by: sortBy, dir: sortDir }} />
          )}
          {activeTab === "onedrive" && (
            <FilesOneDrive userId={userId} onSelect={setPreviewFile} selectedFile={previewFile} searchQuery={searchQuery} sort={{ by: sortBy, dir: sortDir }} />
          )}
          {activeTab === "uploads" && (
            <FilesUploads userId={userId} onSelect={setPreviewFile} selectedFile={previewFile} searchQuery={searchQuery} sort={{ by: sortBy, dir: sortDir }} />
          )}
        </div>

        {/* Preview panel */}
        {previewFile && (
          <FilesPreview
            file={previewFile}
            onClose={() => setPreviewFile(null)}
            className="flex-1"
          />
        )}
      </div>
    </div>
  );
}
