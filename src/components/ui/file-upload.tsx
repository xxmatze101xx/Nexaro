"use client";

import { cn } from "@/lib/utils";
import React, { useRef } from "react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

export const FileUpload = ({
    onChange,
}: {
    onChange?: (files: File[]) => void;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (newFiles: File[]) => {
        onChange?.(newFiles);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const { getRootProps, isDragActive } = useDropzone({
        multiple: false,
        noClick: true,
        onDrop: handleFileChange,
        onDropRejected: (error) => {
            console.log(error);
        },
    });

    return (
        <div className="w-full" {...getRootProps()}>
            <div
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer border border-dashed transition-colors",
                    isDragActive
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 hover:border-primary/50 hover:bg-muted/40"
                )}
            >
                <input
                    ref={fileInputRef}
                    id="file-upload-handle"
                    type="file"
                    onChange={(e) => handleFileChange(Array.from(e.target.files ?? []))}
                    className="hidden"
                />
                <IconUpload className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                    {isDragActive ? "Loslassen zum Hochladen" : "Datei hochladen oder hierher ziehen"}
                </span>
            </div>
        </div>
    );
};
