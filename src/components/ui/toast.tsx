"use client";

import { cn } from "@/lib/utils";
import type { Toast } from "@/hooks/useToast";

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
                        "pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg",
                        "bg-foreground text-background text-sm font-medium",
                        "animate-in slide-in-from-bottom-4 fade-in duration-200",
                        "max-w-xs w-max"
                    )}
                >
                    {toast.icon && <span>{toast.icon}</span>}
                    <span>{toast.message}</span>
                    <button
                        onClick={() => onDismiss(toast.id)}
                        className="ml-1 opacity-60 hover:opacity-100 transition-opacity text-xs"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
