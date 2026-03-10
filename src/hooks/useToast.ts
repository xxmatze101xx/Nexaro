"use client";

import { useState, useCallback } from "react";

export interface Toast {
    id: string;
    message: string;
    icon?: string;
}

let toastIdCounter = 0;

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, icon?: string) => {
        const id = String(++toastIdCounter);
        setToasts(prev => [...prev, { id, message, icon }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, showToast, dismissToast };
}
