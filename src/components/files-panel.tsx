"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { FilesAttachments } from "@/components/files-attachments";
import { FilesDrive } from "@/components/files-drive";
import { FilesOneDrive } from "@/components/files-onedrive";
import { FilesUploads } from "@/components/files-uploads";
import { FilesPreview, type PreviewFile } from "@/components/files-preview";

type Tab = "attachments" | "drive" | "onedrive" | "uploads";

interface FilesPanelProps {
  userId: string;
  className?: string;
}

export function FilesPanel({ userId, className }: FilesPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("attachments");
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPreviewFile(null);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "attachments", label: "Attachments" },
    { id: "drive", label: "Google Drive" },
    { id: "onedrive", label: "OneDrive" },
    { id: "uploads", label: "Uploads" },
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
      </div>

      {/* Split: file list + preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* File list — shrinks to fixed width when preview is open */}
        <div className={cn("flex flex-col overflow-hidden transition-all", previewFile ? "w-[380px] shrink-0 border-r border-border" : "flex-1")}>
          {activeTab === "attachments" && (
            <FilesAttachments userId={userId} onSelect={setPreviewFile} selectedFile={previewFile} />
          )}
          {activeTab === "drive" && (
            <FilesDrive userId={userId} onSelect={setPreviewFile} selectedFile={previewFile} />
          )}
          {activeTab === "onedrive" && (
            <FilesOneDrive userId={userId} onSelect={setPreviewFile} selectedFile={previewFile} />
          )}
          {activeTab === "uploads" && (
            <FilesUploads userId={userId} onSelect={setPreviewFile} selectedFile={previewFile} />
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
