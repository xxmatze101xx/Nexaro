"use client";

import { cn } from "@/lib/utils";
import type { Toast } from "@/hooks/useToast";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ICON_MAP = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
} as const;

interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={cn(
                        "pointer-events-auto flex items-center gap-2.5 pl-3.5 pr-3 py-3 rounded-xl shadow-lg",
                        "bg-foreground text-background text-sm font-medium",
                        "animate-in slide-in-from-bottom-4 fade-in duration-200",
                        "max-w-xs w-max"
                    )}
                >
                    {toast.type && ICON_MAP[toast.type]}
                    <span>{toast.message}</span>
                    <button
                        onClick={() => onDismiss(toast.id)}
                        className="ml-1 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center"
                        aria-label="Schließen"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
