"use client";

import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
    id: string;
    message: string;
    type?: ToastType;
}

interface ToastContextValue {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType) => void;
    dismissToast: (id: string) => void;
}

let toastIdCounter = 0;

const noop = () => undefined;

const ToastContext = createContext<ToastContextValue>({
    toasts: [],
    showToast: noop,
    dismissToast: noop,
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type?: ToastType) => {
        const id = String(++toastIdCounter);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const value = useMemo<ToastContextValue>(
        () => ({ toasts, showToast, dismissToast }),
        [toasts, showToast, dismissToast],
    );

    return createElement(ToastContext.Provider, { value }, children);
}

export function useToast(): ToastContextValue {
    return useContext(ToastContext);
}
