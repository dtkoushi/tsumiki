import React, { useState, useEffect } from 'react';
import type { ToastItem } from './toast';
import { subscribers } from './toast';

const typeStyles: Record<ToastItem['type'], string> = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-slate-700 text-white',
};

export function Toaster() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const handler = (updated: ToastItem[]) => setToasts(updated);
        subscribers.add(handler);
        return () => { subscribers.delete(handler); };
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right duration-200 ${typeStyles[t.type]}`}
                    role="status"
                    aria-live="polite"
                >
                    {t.message}
                </div>
            ))}
        </div>
    );
}
