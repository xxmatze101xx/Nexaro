"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { FilesAttachments } from "@/components/files-attachments";
import { FilesDrive } from "@/components/files-drive";
import { FilesOneDrive } from "@/components/files-onedrive";
import { FilesUploads } from "@/components/files-uploads";

type Tab = "attachments" | "drive" | "onedrive" | "uploads";

interface FilesPanelProps {
  userId: string;
  className?: string;
}

export function FilesPanel({ userId, className }: FilesPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("attachments");

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
            onClick={() => setActiveTab(tab.id)}
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

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "attachments" && <FilesAttachments userId={userId} />}
        {activeTab === "drive" && <FilesDrive userId={userId} />}
        {activeTab === "onedrive" && <FilesOneDrive userId={userId} />}
        {activeTab === "uploads" && <FilesUploads userId={userId} />}
      </div>
    </div>
  );
}
